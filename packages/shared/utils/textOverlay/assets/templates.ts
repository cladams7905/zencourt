import type {
  OverlayFontRole,
  OverlayLine,
  OverlayTemplatePattern
} from "../../../types/video";

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
        fontSizeScale: 0.88,
        textTransform: "none",
        fontStyle: "normal"
      },
      {
        fontRole: "headline",
        fontSizeScale: 2.05,
        textTransform: "none",
        fontStyle: "normal"
      },
      {
        fontRole: "accent",
        fontSizeScale: 0.88,
        textTransform: "none",
        fontStyle: "normal"
      }
    ],
    layout: {
      lineHeightScale: 0.76,
      lineMarginTopByIndex: {
        1: "0.06em",
        2: "0.08em"
      },
      lineMarginBottomByIndex: {
        1: "0.06em"
      },
      letterSpacingByRole: {
        headline: "-0.045em",
        accent: "-0.01em"
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
    ],
    layout: {
      lineHeightScale: 0.78,
      lineMarginTopByIndex: {
        1: "0.08em"
      },
      lineMarginBottomByIndex: {
        0: "0.04em"
      },
      letterSpacingByRole: {
        headline: "-0.035em",
        accent: "-0.01em"
      }
    }
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
  }
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
