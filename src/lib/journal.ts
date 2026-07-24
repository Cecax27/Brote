import type { JournalEntryType } from "./supabase/journal-entries";

export const JOURNAL_ENTRY_TYPES = {
  watering: {
    label: "Riego",
    icon: "watering-can-outline" as const,
    color: "#6E8E6A",
  },
  fertilizing: {
    label: "Fertilización",
    icon: "sprout" as const,
    color: "#A8C29A",
  },
  repotting: {
    label: "Trasplante",
    icon: "flower-tulip-outline" as const,
    color: "#C7A47B",
  },
  pruning: {
    label: "Poda",
    icon: "content-cut" as const,
    color: "#D7B65A",
  },
  observation: {
    label: "Observación",
    icon: "eye-outline" as const,
    color: "#7B756E",
  },
} as const satisfies Record<
  JournalEntryType,
  { label: string; icon: string; color: string }
>;

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

const MONTHS_CAPITALIZED = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export function formatEntryDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  return `${day} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

export function formatEntryMonthHeader(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS_CAPITALIZED[d.getMonth()]} ${d.getFullYear()}`;
}

export type MonthGroup = {
  header: string;
  entries: { id: string; created_at: string }[];
};

export function groupEntriesByMonth<T extends { created_at: string }>(
  entries: T[],
): { header: string; entries: T[] }[] {
  const groups: { header: string; entries: T[] }[] = [];
  let currentHeader = "";
  let currentGroup: T[] = [];

  for (const entry of entries) {
    const header = formatEntryMonthHeader(entry.created_at);
    if (header !== currentHeader) {
      if (currentGroup.length > 0) {
        groups.push({ header: currentHeader, entries: currentGroup });
      }
      currentHeader = header;
      currentGroup = [entry];
    } else {
      currentGroup.push(entry);
    }
  }

  if (currentGroup.length > 0) {
    groups.push({ header: currentHeader, entries: currentGroup });
  }

  return groups;
}
