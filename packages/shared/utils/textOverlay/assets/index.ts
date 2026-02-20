export {
  PREVIEW_TEXT_OVERLAY_VARIANTS,
  hashTextOverlaySeed,
  pickPreviewTextOverlayVariant,
  pickRichOverlayPosition,
  pickRichOverlayFontPairing,
  pickRichOverlayFontPairingForVariation
} from "./variants";
export type { OverlayVariant } from "./variants";

export {
  PREVIEW_TEXT_OVERLAY_FONT_FAMILY,
  OVERLAY_SCRIPT_FONT_FAMILY,
  OVERLAY_ROUGE_FONT_FAMILY,
  OVERLAY_GWENDOLYN_FONT_FAMILY,
  OVERLAY_TIKTOK_FONT_FAMILY,
  OVERLAY_DM_SERIF_FONT_FAMILY,
  OVERLAY_ITALIANA_FONT_FAMILY,
  OVERLAY_ONEST_FONT_FAMILY,
  RICH_OVERLAY_FONT_PAIRINGS,
  OVERLAY_FONT_PAIRINGS
} from "./fonts";
export type { FontRoleStyle } from "./fonts";

export {
  OVERLAY_TEMPLATES,
  DEFAULT_OVERLAY_TEMPLATE_PATTERN,
  resolveOverlayTemplatePattern,
  getOverlayTemplate,
  buildOverlayTemplateLines
} from "./templates";
export type {
  OverlayTemplateLineDef,
  OverlayTemplateLayoutDef,
  OverlayTemplateDef,
  OverlayTemplateInput
} from "./templates";

export {
  appendRandomHeaderSuffix,
  parseInlineItalicSegments
} from "./parsing";
export type {
  RandomHeaderSuffixOptions,
  InlineTextSegment
} from "./parsing";

export {
  PREVIEW_TEXT_OVERLAY_ARROW_PATHS,
  pickSandwichOverlayArrowPath
} from "./arrows";

export {
  PREVIEW_TEXT_OVERLAY_POSITION_TOP,
  PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR,
  PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR_OPAQUE,
  PREVIEW_TEXT_OVERLAY_TEXT_COLOR,
  PREVIEW_TEXT_OVERLAY_NO_BACKGROUND_TEXT_SHADOW,
  PREVIEW_TEXT_OVERLAY_MAX_WIDTH,
  PREVIEW_TEXT_OVERLAY_BORDER_RADIUS,
  PREVIEW_TEXT_OVERLAY_LINE_HEIGHT,
  PREVIEW_TEXT_OVERLAY_LETTER_SPACING,
  PREVIEW_COMPOSITION_WIDTH,
  PREVIEW_TEXT_OVERLAY_LAYOUT,
  overlayPxToCqw
} from "./layout";
