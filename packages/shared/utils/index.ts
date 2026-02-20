export { createLogger, createChildLogger } from "./logger";
export type { LoggerOptions } from "./logger";

export {
  sanitizePathSegment,
  sanitizeFilename,
  getListingFolder,
  getListingImagePath,
  getRoomVideoFolder,
  getVideoJobFolder,
  getVideoJobVideoPath,
  getVideoJobThumbnailPath,
  getRoomVideoPath,
  getFinalVideoFolder,
  getFinalVideoPath,
  getThumbnailPath,
  getTempVideoFolder,
  buildUserListingVideoKey,
  getGenericUploadPath,
  getUserMediaFolder,
  getUserMediaThumbnailFolder,
  getUserMediaPath,
  getUserMediaThumbnailPath,
  buildGenericUploadKey,
  generateTempListingId,
  extractStorageKeyFromUrl,
  buildStoragePublicUrl,
  getStorageEndpointHost,
  isUrlFromStorageEndpoint
} from "./storagePaths/index";

export { buildStorageConfigFromEnv } from "./storageConfig";
export type { StorageConfig, StorageEnvConfig } from "./storageConfig";

export {
  PREVIEW_TEXT_OVERLAY_VARIANTS,
  hashTextOverlaySeed,
  pickPreviewTextOverlayVariant,
  pickRichOverlayPosition,
  pickRichOverlayFontPairing,
  pickRichOverlayFontPairingForVariation,
  PREVIEW_TEXT_OVERLAY_FONT_FAMILY,
  OVERLAY_SCRIPT_FONT_FAMILY,
  OVERLAY_ROUGE_FONT_FAMILY,
  OVERLAY_GWENDOLYN_FONT_FAMILY,
  OVERLAY_TIKTOK_FONT_FAMILY,
  OVERLAY_DM_SERIF_FONT_FAMILY,
  OVERLAY_ITALIANA_FONT_FAMILY,
  OVERLAY_ONEST_FONT_FAMILY,
  RICH_OVERLAY_FONT_PAIRINGS,
  OVERLAY_FONT_PAIRINGS,
  OVERLAY_TEMPLATES,
  DEFAULT_OVERLAY_TEMPLATE_PATTERN,
  resolveOverlayTemplatePattern,
  getOverlayTemplate,
  buildOverlayTemplateLines,
  appendRandomHeaderSuffix,
  parseInlineItalicSegments,
  PREVIEW_TEXT_OVERLAY_ARROW_PATHS,
  pickSandwichOverlayArrowPath,
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
} from "./textOverlay/index";
export type {
  OverlayVariant,
  FontRoleStyle,
  OverlayTemplateLineDef,
  OverlayTemplateLayoutDef,
  OverlayTemplateDef,
  OverlayTemplateInput,
  RandomHeaderSuffixOptions,
  InlineTextSegment
} from "./textOverlay/index";

export { computeOverlayLineStyles } from "./textOverlay/renderer/index";
export type {
  ComputedOverlayLineStyle
} from "./textOverlay/renderer/index";

export {
  requireNonEmptyParam,
  requireNonEmptyString,
  requireNonEmptyStringArray,
  readJsonBodySafe
} from "./api/validation";
export {
  buildApiErrorBody,
  apiErrorCodeFromStatus
} from "./api/responses";
export { parseRequiredRouteParam } from "./api/parsers";

export {
  normalizeRoomCategory,
  isPriorityCategory,
  getDurationSecondsForCategory
} from "./priorityCategories";
