import type {
  PreviewTextOverlay,
  OverlayLine,
  OverlayFontRole,
  OverlayTemplatePattern,
  OverlayFontPairing
} from "../types/video";

// ---------------------------------------------------------------------------
// Variant selection
// ---------------------------------------------------------------------------

export interface OverlayVariant {
  position: PreviewTextOverlay["position"];
  background: PreviewTextOverlay["background"];
  font: PreviewTextOverlay["font"];
  fontPairing: OverlayFontPairing;
}

// Weighted pool: darker backgrounds appear more often than light backgrounds.
export const PREVIEW_TEXT_OVERLAY_VARIANTS: OverlayVariant[] = [
  {
    position: "bottom-third",
    background: "brown-700",
    font: "serif-classic",
    fontPairing: "elegant-script"
  },
  {
    position: "bottom-third",
    background: "black",
    font: "serif-elegant",
    fontPairing: "modern-script"
  },
  {
    position: "top-third",
    background: "brown-700",
    font: "serif-elegant",
    fontPairing: "script-forward"
  },
  {
    position: "bottom-third",
    background: "brown-500",
    font: "serif-classic",
    fontPairing: "elegant-script"
  },
  {
    position: "center",
    background: "black",
    font: "serif-classic",
    fontPairing: "modern-script"
  },
  {
    position: "top-third",
    background: "brown-700",
    font: "serif-elegant",
    fontPairing: "elegant-script"
  },
  {
    position: "bottom-third",
    background: "brown-500",
    font: "sans-modern",
    fontPairing: "classic-clean"
  },
  {
    position: "center",
    background: "brown-700",
    font: "serif-classic",
    fontPairing: "script-forward"
  },
  // Lighter options are intentionally fewer.
  {
    position: "top-third",
    background: "brown-300",
    font: "sans-modern",
    fontPairing: "classic-clean"
  },
  {
    position: "center",
    background: "brown-200",
    font: "serif-elegant",
    fontPairing: "classic-clean"
  },
  {
    position: "bottom-third",
    background: "brown-100",
    font: "sans-modern",
    fontPairing: "modern-script"
  },
  {
    position: "center",
    background: "white",
    font: "serif-classic",
    fontPairing: "elegant-script"
  }
];

export function hashTextOverlaySeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pickPreviewTextOverlayVariant(seed: string): OverlayVariant {
  const index =
    hashTextOverlaySeed(seed) % PREVIEW_TEXT_OVERLAY_VARIANTS.length;
  return PREVIEW_TEXT_OVERLAY_VARIANTS[index]!;
}

// ---------------------------------------------------------------------------
// Font families
// ---------------------------------------------------------------------------

export const PREVIEW_TEXT_OVERLAY_FONT_FAMILY: Record<
  PreviewTextOverlay["font"],
  string
> = {
  "serif-elegant":
    'var(--font-libre, "Libre Calson Text"), "Times New Roman", serif',
  "serif-classic": 'Georgia, "Times New Roman", serif',
  "sans-modern":
    'var(--font-body, "Mulish"), "Avenir Next", "Segoe UI", Arial, sans-serif'
};

export const OVERLAY_SCRIPT_FONT_FAMILY =
  'var(--font-rouge, "Rouge Script"), cursive';

// ---------------------------------------------------------------------------
// Font pairings — maps each pairing to font-family + weight per role.
// Uses var(--font-*, "FallbackName") so the web app resolves the CSS variable
// while the video-server falls back to the canonical Google Font name loaded
// via @remotion/google-fonts.
// ---------------------------------------------------------------------------

export interface FontRoleStyle {
  fontFamily: string;
  fontWeight: number;
}

export const OVERLAY_FONT_PAIRINGS: Record<
  OverlayFontPairing,
  Record<OverlayFontRole, FontRoleStyle>
> = {
  "elegant-script": {
    headline: {
      fontFamily: PREVIEW_TEXT_OVERLAY_FONT_FAMILY["serif-elegant"],
      fontWeight: 600
    },
    accent: { fontFamily: OVERLAY_SCRIPT_FONT_FAMILY, fontWeight: 700 },
    body: {
      fontFamily: PREVIEW_TEXT_OVERLAY_FONT_FAMILY["serif-elegant"],
      fontWeight: 400
    }
  },
  "modern-script": {
    headline: {
      fontFamily: PREVIEW_TEXT_OVERLAY_FONT_FAMILY["sans-modern"],
      fontWeight: 700
    },
    accent: { fontFamily: OVERLAY_SCRIPT_FONT_FAMILY, fontWeight: 700 },
    body: {
      fontFamily: PREVIEW_TEXT_OVERLAY_FONT_FAMILY["sans-modern"],
      fontWeight: 400
    }
  },
  "classic-clean": {
    headline: {
      fontFamily: PREVIEW_TEXT_OVERLAY_FONT_FAMILY["serif-classic"],
      fontWeight: 700
    },
    accent: {
      fontFamily: PREVIEW_TEXT_OVERLAY_FONT_FAMILY["serif-elegant"],
      fontWeight: 400
    },
    body: {
      fontFamily: PREVIEW_TEXT_OVERLAY_FONT_FAMILY["serif-classic"],
      fontWeight: 400
    }
  },
  "script-forward": {
    headline: { fontFamily: OVERLAY_SCRIPT_FONT_FAMILY, fontWeight: 700 },
    accent: {
      fontFamily: PREVIEW_TEXT_OVERLAY_FONT_FAMILY["sans-modern"],
      fontWeight: 400
    },
    body: {
      fontFamily: PREVIEW_TEXT_OVERLAY_FONT_FAMILY["sans-modern"],
      fontWeight: 400
    }
  }
};

// ---------------------------------------------------------------------------
// Template definitions — describe the visual structure of each pattern.
// Each line has a font role, relative size scale, text transform, and style.
// ---------------------------------------------------------------------------

export interface OverlayTemplateLineDef {
  fontRole: OverlayFontRole;
  fontSizeScale: number;
  textTransform: "none" | "uppercase";
  fontStyle: "normal" | "italic";
}

export interface OverlayTemplateLayoutDef {
  lineHeightScale?: number;
  defaultLineMarginTop?: number | string;
  lineMarginTopByIndex?: Partial<Record<number, number | string>>;
  lineMarginBottomByIndex?: Partial<Record<number, number | string>>;
  letterSpacingByRole?: Partial<Record<OverlayFontRole, number | string>>;
}

export interface OverlayTemplateDef {
  pattern: OverlayTemplatePattern;
  lines: OverlayTemplateLineDef[];
  layout?: OverlayTemplateLayoutDef;
}

export const OVERLAY_TEMPLATES: Record<
  OverlayTemplatePattern,
  OverlayTemplateDef
> = {
  simple: {
    pattern: "simple",
    lines: [
      {
        fontRole: "body",
        fontSizeScale: 0.7,
        textTransform: "none",
        fontStyle: "normal"
      }
    ]
  },
  sandwich: {
    pattern: "sandwich",
    lines: [
      {
        fontRole: "accent",
        fontSizeScale: 0.9,
        textTransform: "none",
        fontStyle: "normal"
      },
      {
        fontRole: "headline",
        fontSizeScale: 2.1,
        textTransform: "none",
        fontStyle: "normal"
      },
      {
        fontRole: "accent",
        fontSizeScale: 0.9,
        textTransform: "none",
        fontStyle: "normal"
      }
    ],
    layout: {
      lineHeightScale: 0.88,
      lineMarginTopByIndex: {
        1: "0.14em",
        2: "0.14em"
      },
      lineMarginBottomByIndex: {
        1: "0.14em"
      },
      letterSpacingByRole: {
        headline: "-0.055em"
      }
    }
  },
  "accent-headline": {
    pattern: "accent-headline",
    lines: [
      {
        fontRole: "headline",
        fontSizeScale: 1.8,
        textTransform: "none",
        fontStyle: "normal"
      },
      {
        fontRole: "accent",
        fontSizeScale: 1.0,
        textTransform: "none",
        fontStyle: "normal"
      }
    ]
  },
  "script-headline": {
    pattern: "script-headline",
    lines: [
      {
        fontRole: "accent",
        fontSizeScale: 2.2,
        textTransform: "none",
        fontStyle: "normal"
      }
    ]
  }
};

export const DEFAULT_OVERLAY_TEMPLATE_PATTERN: OverlayTemplatePattern =
  "simple";

export interface OverlayTemplateInput {
  headline?: string | null;
  accent_top?: string | null;
  accent_bottom?: string | null;
}

interface OverlayTemplateBuildResult {
  pattern: OverlayTemplatePattern;
  lines: OverlayLine[];
}

type OverlayTemplateLineBuilder = (
  input: OverlayTemplateInput,
  fallbackText: string
) => OverlayLine[];

const OVERLAY_TEMPLATE_LINE_BUILDERS: Record<
  OverlayTemplatePattern,
  OverlayTemplateLineBuilder
> = {
  simple: (input, fallbackText) => [
    { text: input.headline ?? fallbackText, fontRole: "body" }
  ],
  sandwich: (input, fallbackText) => {
    const lines: OverlayLine[] = [];
    if (input.accent_top) {
      lines.push({ text: input.accent_top, fontRole: "accent" });
    }
    lines.push({ text: input.headline ?? fallbackText, fontRole: "headline" });
    if (input.accent_bottom) {
      lines.push({ text: input.accent_bottom, fontRole: "accent" });
    }
    return lines;
  },
  "accent-headline": (input, fallbackText) => {
    const lines: OverlayLine[] = [
      { text: input.headline ?? fallbackText, fontRole: "headline" }
    ];
    const accent = input.accent_bottom ?? input.accent_top;
    if (accent) {
      lines.push({ text: accent, fontRole: "accent" });
    }
    return lines;
  },
  "script-headline": (input, fallbackText) => [
    {
      text:
        input.accent_top ??
        input.accent_bottom ??
        input.headline ??
        fallbackText,
      fontRole: "accent"
    }
  ]
};

export function resolveOverlayTemplatePattern(
  input?: OverlayTemplateInput | null
): OverlayTemplatePattern {
  if (!input) return DEFAULT_OVERLAY_TEMPLATE_PATTERN;
  if (input.accent_top && input.accent_bottom) return "sandwich";
  if (input.accent_bottom || input.accent_top) return "accent-headline";
  return DEFAULT_OVERLAY_TEMPLATE_PATTERN;
}

export function getOverlayTemplate(
  pattern?: OverlayTemplatePattern | null
): OverlayTemplateDef {
  return OVERLAY_TEMPLATES[pattern ?? DEFAULT_OVERLAY_TEMPLATE_PATTERN];
}

export function buildOverlayTemplateLines(
  input: OverlayTemplateInput | null | undefined,
  fallbackText: string,
  patternOverride?: OverlayTemplatePattern
): OverlayTemplateBuildResult {
  const safeInput: OverlayTemplateInput = input ?? {};
  const pattern = patternOverride ?? resolveOverlayTemplatePattern(safeInput);
  const builder = OVERLAY_TEMPLATE_LINE_BUILDERS[pattern];
  const lines = builder(safeInput, fallbackText).filter(
    (line) => line.text.trim().length > 0
  );

  if (lines.length > 0) {
    return { pattern, lines };
  }

  return {
    pattern: DEFAULT_OVERLAY_TEMPLATE_PATTERN,
    lines: [{ text: fallbackText, fontRole: "body" }]
  };
}

const DEFAULT_HEADER_SUFFIX_EMOJIS = ["✨", "😍", "👀", "👏"] as const;
const DEFAULT_HEADER_ARROW_SUFFIX = "→";

export interface RandomHeaderSuffixOptions {
  emojis?: readonly string[];
  arrowSymbol?: string;
  random?: () => number;
}

/**
 * Appends either a random emoji, a right-arrow symbol, or nothing.
 * Each bucket has equal probability (1/3).
 */
export function appendRandomHeaderSuffix(
  header: string,
  options?: RandomHeaderSuffixOptions
): string {
  const trimmedHeader = header.trim();
  if (!trimmedHeader) return header;

  const random = options?.random ?? Math.random;
  const bucket = Math.floor(random() * 3);

  if (bucket === 2) {
    return trimmedHeader;
  }

  if (bucket === 1) {
    const arrow = options?.arrowSymbol ?? DEFAULT_HEADER_ARROW_SUFFIX;
    return arrow ? `${trimmedHeader} ${arrow}` : trimmedHeader;
  }

  const emojis = options?.emojis ?? DEFAULT_HEADER_SUFFIX_EMOJIS;
  if (emojis.length === 0) {
    return trimmedHeader;
  }
  const emojiIndex = Math.floor(random() * emojis.length);
  const emoji = emojis[emojiIndex];
  return emoji ? `${trimmedHeader} ${emoji}` : trimmedHeader;
}

export const PREVIEW_TEXT_OVERLAY_ARROW_PATHS = [
  "/overlays/arrows/noun-arrow-2581915.svg",
  "/overlays/arrows/noun-arrow-3004573.svg",
  "/overlays/arrows/noun-arrow-3309229.svg",
  "/overlays/arrows/noun-arrow-3309237.svg",
  "/overlays/arrows/noun-arrow-up-1155837.svg",
  "/overlays/arrows/noun-dip-right-3905878.svg",
  "/overlays/arrows/noun-doodle-arrow-1937655.svg",
  "/overlays/arrows/noun-drawn-arrow-right-3464695.svg",
  "/overlays/arrows/noun-drawn-arrow-right-3464709.svg",
  "/overlays/arrows/noun-hand-drawn-arrow-2440595.svg",
  "/overlays/arrows/noun-hand-drawn-arrow-2440669.svg",
  "/overlays/arrows/noun-hand-drawn-arrow-2440680.svg",
  "/overlays/arrows/noun-heart-arrow-845384.svg",
  "/overlays/arrows/noun-right-2380236.svg",
  "/overlays/arrows/noun-right-arrow-786362.svg",
  "/overlays/arrows/noun-right-arrow-786589.svg",
  "/overlays/arrows/noun-right-arrow-787175.svg",
  "/overlays/arrows/noun-right-arrows-786531.svg"
] as const;

function buildOverlayArrowSeed(overlay: PreviewTextOverlay): string {
  const lineSeed =
    overlay.lines?.map((line) => `${line.fontRole}:${line.text}`).join("|") ?? "";
  return `${overlay.templatePattern ?? "simple"}:${overlay.text}:${lineSeed}`;
}

/**
 * For sandwich templates, returns either a random arrow path or null.
 * Probability is 50/50 between "has arrow" and "no arrow".
 */
export function pickSandwichOverlayArrowPath(
  overlay: PreviewTextOverlay
): string | null {
  if (overlay.templatePattern !== "sandwich") {
    return null;
  }

  const seed = buildOverlayArrowSeed(overlay);
  const shouldShowArrow = hashTextOverlaySeed(`${seed}:show-arrow`) % 2 === 0;
  if (!shouldShowArrow) {
    return null;
  }

  const index =
    hashTextOverlaySeed(`${seed}:arrow-index`) %
    PREVIEW_TEXT_OVERLAY_ARROW_PATHS.length;
  return PREVIEW_TEXT_OVERLAY_ARROW_PATHS[index] ?? null;
}

// ---------------------------------------------------------------------------
// Positioning, colors, and layout constants
// ---------------------------------------------------------------------------

export const PREVIEW_TEXT_OVERLAY_POSITION_TOP: Record<
  PreviewTextOverlay["position"],
  string
> = {
  "top-third": "17%",
  center: "50%",
  "bottom-third": "64%"
};

export const PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR: Record<
  PreviewTextOverlay["background"],
  string
> = {
  black: "rgba(0, 0, 0, 0.9)",
  brown: "rgba(118, 95, 76, 0.9)",
  "brown-700": "rgba(85, 62, 47, 0.9)",
  "brown-500": "rgba(118, 95, 76, 0.9)",
  "brown-300": "rgba(166, 142, 124, 0.9)",
  "brown-200": "rgba(201, 184, 170, 0.9)",
  "brown-100": "rgba(229, 220, 211, 0.9)",
  white: "rgba(245, 241, 236, 0.9)",
  none: "transparent"
};

export const PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR_OPAQUE: Record<
  PreviewTextOverlay["background"],
  string
> = {
  black: "rgba(0, 0, 0, 0.95)",
  brown: "rgba(118, 95, 76, 0.95)",
  "brown-700": "rgba(85, 62, 47, 0.95)",
  "brown-500": "rgba(118, 95, 76, 0.95)",
  "brown-300": "rgba(166, 142, 124, 0.95)",
  "brown-200": "rgba(201, 184, 170, 0.95)",
  "brown-100": "rgba(229, 220, 211, 0.95)",
  white: "rgba(245, 241, 236, 0.95)",
  none: "transparent"
};

export const PREVIEW_TEXT_OVERLAY_TEXT_COLOR: Record<
  PreviewTextOverlay["background"],
  string
> = {
  black: "#f5f3ef",
  brown: "#f5f3ef",
  "brown-700": "#f5f3ef",
  "brown-500": "#f5f3ef",
  "brown-300": "#f5f3ef",
  "brown-200": "#16120e",
  "brown-100": "#16120e",
  white: "#16120e",
  none: "#f5f3ef"
};
export const PREVIEW_TEXT_OVERLAY_NO_BACKGROUND_TEXT_SHADOW =
  "0 2px 8px rgba(0, 0, 0, 0.5), 0 0 2px rgba(0, 0, 0, 0.7)";
export const PREVIEW_TEXT_OVERLAY_MAX_WIDTH = "88%";
export const PREVIEW_TEXT_OVERLAY_BORDER_RADIUS = 4;
export const PREVIEW_TEXT_OVERLAY_LINE_HEIGHT = 1.2;
export const PREVIEW_TEXT_OVERLAY_LETTER_SPACING = 0.1;

export const PREVIEW_COMPOSITION_WIDTH = 1080;

export const PREVIEW_TEXT_OVERLAY_LAYOUT = {
  video: {
    horizontalPaddingPx: 70,
    boxPaddingVerticalPx: 18,
    boxPaddingHorizontalPx: 26,
    fontSizePx: 68
  }
} as const;

/** Convert a video-composition pixel value to a container-query-relative unit. */
export function overlayPxToCqw(px: number): string {
  return `${((px / PREVIEW_COMPOSITION_WIDTH) * 100).toFixed(3)}cqw`;
}
