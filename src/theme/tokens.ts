/**
 * Brote design tokens.
 *
 * Single source of truth for the visual system, codified from the
 * brote-visual-guide. Consumed via `useTheme()` — never import these raw
 * objects in components; reference tokens through the hook so a future dark
 * palette can slot in without touching call sites.
 *
 * The light palette below is the only shipped theme. The shape is ready for a
 * dark variant (see `Theme` type) but no dark values are authored here.
 */

export type ColorToken = string;

export const lightColors = {
  /** Sage green — calm, natural, adult. Primary actions. */
  primary: "#6E8E6A",
  /** Lighter sage — tints, subtle accents. */
  secondary: "#A8C29A",
  /** Warm white — the app background. Never pure #FFFFFF. */
  background: "#F8F6F2",
  /** Near-white card surface, used 90–95% over the background. */
  surface: "#FFFFFF",
  /** Warm beige-brown — secondary buttons. */
  earth: "#C7A47B",
  text: {
    /** Brown-black — body text. Never pure #000. (#3F3A36 on #F8F6F2 ≈ 10.4:1 AA) */
    primary: "#12100e",
    /** Warm gray — secondary copy. */
    secondary: "#93877a",
  },
  accent: {
    /** Mustard — small highlight details only. */
    mustard: "#D7B65A",
    /** Terracotta — small highlight details / destructive. */
    terracotta: "#C87C5A",
  },
  /** Subtle borders / dividers, derived from secondary text with low opacity feel. */
  border: "#E3DED7",
  /** Disabled / placeholder surfaces. */
  muted: "#ECE8E1",
} as const;

export type Colors = typeof lightColors;

/** Spacing scale — multiples of 4. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
export type Spacing = typeof spacing;

/** Border radii — everything is rounded, nothing sharp. */
export const radii = {
  input: 14,
  card: 18,
  button: 24,
  sheet: 22,
} as const;
export type Radii = typeof radii;

/** Soft shadows — never harsh drop shadows. */
export const shadows = {
  /** Soft card shadow. */
  soft: {
    shadowColor: "#3F3A36",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  /** Resting card shadow — lighter than soft. */
  resting: {
    shadowColor: "#3F3A36",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 0,
  },
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;
export type Shadows = typeof shadows;

/**
 * Font families. Static TTFs named after their PostScript name give a
 * consistent family string on iOS (name extracted from file) and Android
 * (filename). Each weight is its own family — we reference weights explicitly
 * and never rely on `fontWeight` selecting a named instance.
 */
export const fontFamilies = {
  /** Fraunces — serif headlines (9pt optical size, crisp at 22–32px). */
  headingRegular: "Fraunces9pt-Regular",
  headingSemiBold: "Fraunces9pt-SemiBold",
  headingBold: "Fraunces9pt-Bold",
  /** Inter — body / UI. */
  body: "Inter-Regular",
  bodyMedium: "Inter-Medium",
  bodySemiBold: "Inter-SemiBold",
  bodyBold: "Inter-Bold",
} as const;
export type FontFamilies = typeof fontFamilies;

export type FontWeight = "regular" | "medium" | "semiBold" | "bold";

export type TypeSize = {
  /** Font size in px. */
  size: number;
  /** Line height in px. */
  lineHeight: number;
  /** Font family token. */
  fontFamily: string;
  /** Mapped `fontWeight` value (kept for parity; the static family already encodes weight). */
  fontWeight: string;
};

/** Typography scale. Headlines use Fraunces, body uses Inter. */
export const typeScale: Record<string, TypeSize> = {
  display: {
    size: 32,
    lineHeight: 40,
    fontFamily: fontFamilies.headingRegular,
    fontWeight: "600",
  },
  h1: {
    size: 26,
    lineHeight: 32,
    fontFamily: fontFamilies.headingRegular,
    fontWeight: "600",
  },
  h2: {
    size: 22,
    lineHeight: 28,
    fontFamily: fontFamilies.headingRegular,
    fontWeight: "400",
  },
  h3: {
    size: 16,
    lineHeight: 24,
    fontFamily: fontFamilies.headingRegular,
    fontWeight: "600",
  },
  body: {
    size: 16,
    lineHeight: 24,
    fontFamily: fontFamilies.body,
    fontWeight: "400",
  },
  bodyMedium: {
    size: 16,
    lineHeight: 24,
    fontFamily: fontFamilies.bodyMedium,
    fontWeight: "500",
  },
  bodySmall: {
    size: 12,
    lineHeight: 20,
    fontFamily: fontFamilies.body,
    fontWeight: "400",
  },
  caption: {
    size: 12,
    lineHeight: 16,
    fontFamily: fontFamilies.bodyMedium,
    fontWeight: "500",
  },
} as const;

export type TypeScale = typeof typeScale;

/** Animation timing — slow and breathing, never bouncy. */
export const motion = {
  duration: {
    micro: 200,
    fast: 250,
    base: 350,
    slow: 450,
    transition: 600,
  },
  /** Ease-in-out-style organic curve. */
  easing: [0.4, 0, 0.2, 1] as const,
} as const;

export type Theme = {
  colors: Colors;
  spacing: Spacing;
  radii: Radii;
  shadows: Shadows;
  fonts: FontFamilies;
  type: TypeScale;
  motion: typeof motion;
  mode: "light";
};

export const lightTheme: Theme = {
  colors: lightColors,
  spacing,
  radii,
  shadows,
  fonts: fontFamilies,
  type: typeScale,
  motion,
  mode: "light",
};

export { lightColors as colors };