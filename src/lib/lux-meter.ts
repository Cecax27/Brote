import * as SecureStore from "expo-secure-store";

const CALIBRATION_KEY = "brote-lux-calibration";

export type CalibrationData = { brightRef: number; darkRef: number };

const LUX_CATEGORIES: readonly { max: number; label: string }[] = [
  { max: 500, label: "Muy baja" },
  { max: 2500, label: "Baja" },
  { max: 10000, label: "Media" },
  { max: 25000, label: "Alta" },
  { max: Infinity, label: "Muy alta" },
];

const PROFILE_RANGES: Record<
  string,
  { min: number; max: number; label: string }
> = {
  low: { min: 0, max: 2500, label: "Sombra" },
  medium: { min: 2500, max: 10000, label: "Luz indirecta" },
  bright: { min: 10000, max: 25000, label: "Luz brillante" },
  direct: { min: 25000, max: 100000, label: "Sol directo" },
};

// ---------------------------------------------------------------------------
// Bit reader over a Uint8Array
// ---------------------------------------------------------------------------

class BitReader {
  private pos: number;
  private bitPos: number;

  constructor(private data: Uint8Array) {
    this.pos = 0;
    this.bitPos = 0;
  }

  /** Peek without advancing — read one bit value (0 or 1) at current position. */
  peekBit(): number {
    if (this.pos >= this.data.length) return 0;
    return (this.data[this.pos] >> (7 - this.bitPos)) & 1;
  }

  /** Advance internal position. */
  private advance(): void {
    this.bitPos++;
    if (this.bitPos >= 8) {
      this.bitPos = 0;
      this.pos++;
    }
  }

  readBit(): number {
    const b = this.peekBit();
    this.advance();
    return b;
  }

  readBits(n: number): number {
    let v = 0;
    for (let i = 0; i < n; i++) {
      v = (v << 1) | this.readBit();
    }
    return v;
  }

  /**
   * Read a full byte, handling 0xFF 0x00 byte stuffing.
   * After reading 0xFF: if the next byte is 0x00, skip it and return 0xFF.
   * If the next byte is non-zero and >= 0xD0, it's a marker — do NOT advance past marker.
   */
  readByte(): number {
    if (this.bitPos !== 0) {
      // Align to byte boundary
      this.bitPos = 0;
      this.pos++;
    }
    if (this.pos >= this.data.length) return 0;
    const b = this.data[this.pos];
    this.pos++;
    if (b === 0xff) {
      const next = this.pos < this.data.length ? this.data[this.pos] : 0;
      if (next === 0x00) {
        this.pos++;
        return 0xff;
      }
    }
    return b;
  }

  /**
   * Check if the next byte in the stream is a marker (0xFF followed by non-zero, non-0x00).
   * Does not advance.
   */
  isMarker(): boolean {
    if (this.pos >= this.data.length - 1) return false;
    return (
      this.data[this.pos] === 0xff && this.data[this.pos + 1] !== 0x00
    );
  }

  alignToByte(): void {
    if (this.bitPos !== 0) {
      this.bitPos = 0;
      this.pos++;
    }
  }
}

// ---------------------------------------------------------------------------
// Huffman tree
// ---------------------------------------------------------------------------

type HuffmanTable = Record<number, number>;

function buildHuffmanTable(
  counts: Uint8Array,
  symbols: Uint8Array,
): HuffmanTable {
  const table: HuffmanTable = {};
  let code = 0;
  let si = 0;
  for (let bits = 1; bits <= 16; bits++) {
    const count = counts[bits - 1];
    for (let i = 0; i < count; i++) {
      table[bits | (code << 4)] = symbols[si];
      si++;
      code++;
    }
    code <<= 1;
  }
  return table;
}

function huffmanDecode(
  reader: BitReader,
  table: HuffmanTable,
): number {
  let code = 0;
  for (let bits = 1; bits <= 16; bits++) {
    code = (code << 1) | reader.readBit();
    const key = bits | (code << 4);
    if (key in table) {
      return table[key];
    }
  }
  throw new Error("Huffman decode failed: no match in 16 bits");
}

// ---------------------------------------------------------------------------
// Marker helpers
// ---------------------------------------------------------------------------

function readUint16(data: Uint8Array, offset: number): number {
  return (data[offset] << 8) | data[offset + 1];
}

function skipSegment(data: Uint8Array, offset: number): number {
  const length = readUint16(data, offset);
  return offset + length;
}

// ---------------------------------------------------------------------------
// JPEG DC luminance extraction
// ---------------------------------------------------------------------------

export function decodeLuminanceFromJPEG(base64: string): number {
  const stripped = base64.replace(/^data:image\/jpeg;base64,/, "");
  const bytes = base64ToUint8Array(stripped);

  let offset = 0;
  if (readUint16(bytes, offset) !== 0xffd8) {
    throw new Error("Not a JPEG image (missing SOI marker)");
  }
  offset += 2;

  // Component info from SOF0
  let numComponents = 0;
  const samplingH: number[] = [];
  const samplingV: number[] = [];
  const qtId: number[] = [];

  // Huffman tables: [class][id] = table
  const huffDC: Record<number, HuffmanTable> = {};
  const huffAC: Record<number, HuffmanTable> = {};

  let height = 0;
  let width = 0;

  // Parse markers until SOS
  while (offset < bytes.length - 1) {
    const marker = readUint16(bytes, offset);
    if (marker === 0xffd9) {
      // EOI before SOS? No scan data.
      throw new Error("JPEG has no scan data (EOI before SOS)");
    }
    if (marker === 0xffda) {
      // SOS found — scan data starts after the SOS header
      offset += 2;
      const sosLength = readUint16(bytes, offset);
      offset += sosLength;
      break;
    }
    if (marker === 0xffc0) {
      // SOF0
      offset += 2;
      const frameLength = readUint16(bytes, offset);
      height = readUint16(bytes, offset + 3);
      width = readUint16(bytes, offset + 5);
      numComponents = bytes[offset + 7];
      for (let i = 0; i < numComponents; i++) {
        const id = bytes[offset + 8 + i * 3];
        const sf = bytes[offset + 9 + i * 3];
        samplingH[id - 1] = (sf >> 4) & 0xf;
        samplingV[id - 1] = sf & 0xf;
        qtId[id - 1] = bytes[offset + 10 + i * 3];
      }
      offset += frameLength;
      continue;
    }
    if (marker === 0xffc4) {
      // DHT
      offset += 2;
      const dhtLength = readUint16(bytes, offset);
      let dhtOffset = offset;
      const dhtEnd = offset + dhtLength;
      while (dhtOffset < dhtEnd) {
        const info = bytes[dhtOffset];
        const tableClass = (info >> 4) & 0xf; // 0=DC, 1=AC
        const tableId = info & 0xf;
        dhtOffset++;
        const counts = bytes.slice(dhtOffset, dhtOffset + 16);
        dhtOffset += 16;
        const symCount = counts.reduce((a, b) => a + b, 0);
        const symbols = bytes.slice(dhtOffset, dhtOffset + symCount);
        dhtOffset += symCount;
        const table = buildHuffmanTable(counts, symbols);
        if (tableClass === 0) {
          huffDC[tableId] = table;
        } else {
          huffAC[tableId] = table;
        }
      }
      offset = dhtEnd;
      continue;
    }
    if ((marker & 0xfff0) === 0xffe0) {
      // APPn — skip
      offset += 2;
      offset = skipSegment(bytes, offset);
      continue;
    }
    if (marker === 0xffdb) {
      // DQT — skip
      offset += 2;
      offset = skipSegment(bytes, offset);
      continue;
    }
    if (marker === 0xffdd) {
      // DRI — skip
      offset += 2;
      offset = skipSegment(bytes, offset);
      continue;
    }
    if (marker === 0xfffe) {
      // COM — skip
      offset += 2;
      offset = skipSegment(bytes, offset);
      continue;
    }
    // Unknown marker with length — skip
    offset += 2;
    if (offset + 2 <= bytes.length) {
      offset = skipSegment(bytes, offset);
    } else {
      break;
    }
  }

  if (numComponents < 1 || numComponents > 4) {
    throw new Error("Invalid JPEG: unsupported number of components");
  }

  // Determine MCU layout
  const maxH = Math.max(...samplingH.slice(0, numComponents));
  const maxV = Math.max(...samplingV.slice(0, numComponents));
  const blocksPerMCU: number[] = [];
  for (let i = 0; i < numComponents; i++) {
    blocksPerMCU[i] = samplingH[i] * samplingV[i];
  }

  // SOS component selectors (which DC/AC tables to use for each component)
  const dcTableId: number[] = [];
  const acTableId: number[] = [];
  // SOS header: Ns(1) + Ns*(compId, dcAcId) + Ss(1) + Se(1) + AhAl(1)
  // We already skipped the SOS header above; we need to re-read it.
  // Actually, we already parsed it at marker detection. The SOS header length tells us where scan data starts.
  // But we also need component table assignments from SOS.
  // Let me re-read the SOS section more carefully.

  // The issue: we need the component -> DC/AC table mapping from SOS.
  // Let me re-parse SOS properly.

  // Go back and find SOS again to read its component selectors
  let sosOffset = 0;
  while (sosOffset < bytes.length - 1) {
    if (readUint16(bytes, sosOffset) === 0xffda) {
      sosOffset += 2;
      const sosLen = readUint16(bytes, sosOffset);
      const ns = bytes[sosOffset + 2];
      for (let i = 0; i < ns; i++) {
        const compId = bytes[sosOffset + 3 + i * 2];
        const tdTa = bytes[sosOffset + 4 + i * 2];
        dcTableId[compId - 1] = (tdTa >> 4) & 0xf;
        acTableId[compId - 1] = tdTa & 0xf;
      }
      sosOffset += sosLen;
      break;
    }
    sosOffset++;
  }

  // Now decode scan data
  const reader = new BitReader(bytes);
  // Advance reader position to match offset
  while (reader["pos"] < offset) {
    reader.readByte();
  }

  // MCU dimensions
  const mcusPerRow = Math.ceil(width / (maxH * 8));
  const mcusPerCol = Math.ceil(height / (maxV * 8));

  const dcPred: number[] = [0, 0, 0, 0];
  const yDCValues: number[] = [];

  for (let mcuY = 0; mcuY < mcusPerCol; mcuY++) {
    for (let mcuX = 0; mcuX < mcusPerRow; mcuX++) {
      // Check for RST markers between MCUs (but not before the first)
      if (mcuX > 0 || mcuY > 0) {
        reader.alignToByte();
        if (reader.isMarker()) {
          const rstMarker = readUint16(bytes, reader["pos"]);
          if ((rstMarker & 0xfff0) === 0xffd0) {
            reader["pos"] += 2;
            // Reset DC predictors
            for (let i = 0; i < 4; i++) dcPred[i] = 0;
          }
        }
      }

      for (let comp = 0; comp < numComponents; comp++) {
        const blocks = blocksPerMCU[comp];
        for (let b = 0; b < blocks; b++) {
          // Decode DC coefficient
          const dcTable = huffDC[dcTableId[comp]];
          if (!dcTable) throw new Error(`No DC Huffman table for component ${comp} id ${dcTableId[comp]}`);
          const acTable = huffAC[acTableId[comp]];
          if (!acTable) throw new Error(`No AC Huffman table for component ${comp} id ${acTableId[comp]}`);

          const category = huffmanDecode(reader, dcTable);
          let diff = 0;
          if (category > 0) {
            const bits = reader.readBits(category);
            diff = bits < (1 << (category - 1))
              ? bits - ((1 << category) - 1)
              : bits;
          }
          dcPred[comp] += diff;

          // Only collect Y component (component 0)
          if (comp === 0) {
            yDCValues.push(dcPred[comp]);
          }

          // Skip AC coefficients
          for (let k = 1; k < 64;) {
            const symbol = huffmanDecode(reader, acTable);
            if (symbol === 0) {
              // EOB — rest are zero
              break;
            }
            const run = (symbol >> 4) & 0xf;
            const cat = symbol & 0xf;
            k += run + 1;
            if (cat > 0) {
              reader.readBits(cat);
            }
            if (k >= 64) break;
          }
        }
      }
    }
  }

  if (yDCValues.length === 0) {
    throw new Error("No luminance data extracted from JPEG");
  }

  const sum = yDCValues.reduce((a, b) => a + b, 0);
  return Math.max(0, Math.min(255, sum / yDCValues.length));
}

// ---------------------------------------------------------------------------
// Base64 → Uint8Array
// ---------------------------------------------------------------------------

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryStr = atob(base64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

export async function loadCalibration(): Promise<CalibrationData | null> {
  try {
    const raw = await SecureStore.getItemAsync(CALIBRATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.brightRef === "number" &&
      typeof parsed.darkRef === "number" &&
      parsed.brightRef > parsed.darkRef
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveCalibration(
  data: CalibrationData,
): Promise<void> {
  await SecureStore.setItemAsync(CALIBRATION_KEY, JSON.stringify(data));
}

export function estimateLux(
  raw: number,
  cal: CalibrationData,
): number {
  const range = cal.brightRef - cal.darkRef;
  if (range <= 0) return raw * 100;
  const lux = ((raw - cal.darkRef) / range) * 100000;
  return Math.max(0, Math.min(100000, Math.round(lux)));
}

export function luxCategory(lux: number): string {
  for (const c of LUX_CATEGORIES) {
    if (lux <= c.max) return c.label;
  }
  return "Muy alta";
}

export function profileLuxRange(
  profile: string,
): { min: number; max: number; label: string } | null {
  return PROFILE_RANGES[profile] ?? null;
}

export type PlacementAdvice = { text: string; color: "green" | "terracotta" | "mustard" | "muted" };

export function placementAdvice(
  lux: number,
  profile: string,
  plantName: string,
): PlacementAdvice {
  const range = profileLuxRange(profile);
  if (!range) {
    return {
      text: `Anota el nivel de luz ideal de ${plantName} para comparar la próxima vez.`,
      color: "muted",
    };
  }

  if (lux < range.min) {
    return {
      text: `Tu ${plantName} necesita más luz de la que hay aquí — busca un sitio más luminoso.`,
      color: "terracotta",
    };
  }

  if (lux > range.max) {
    return {
      text: `Aquí hay demasiada luz para tu ${plantName}.`,
      color: "mustard",
    };
  }

  return {
    text: `Este rincón le viene bien a tu ${plantName}.`,
    color: "green",
  };
}
