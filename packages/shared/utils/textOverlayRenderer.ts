import type { PreviewTextOverlay } from "../types/video";
import {
  OVERLAY_FONT_PAIRINGS,
  OVERLAY_ITALIANA_FONT_FAMILY,
  getOverlayTemplate,
  PREVIEW_TEXT_OVERLAY_FONT_FAMILY,
  PREVIEW_TEXT_OVERLAY_LINE_HEIGHT,
  PREVIEW_TEXT_OVERLAY_LETTER_SPACING,
  PREVIEW_TEXT_OVERLAY_NO_BACKGROUND_TEXT_SHADOW
} from "./textOverlay";

export interface ComputedOverlayLineStyle {
  text: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  textTransform: "none" | "uppercase";
  fontStyle: "normal" | "italic";
  lineHeight: number;
  letterSpacing: number | string;
  textShadow: string;
  marginTop: number | string;
  marginBottom: number | string;
}

function normalizeOverlayLineText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return text;

  const lettersOnly = trimmed.replace(/[^A-Za-z]/g, "");
  if (lettersOnly.length < 3) return text;

  const hasLowercase = /[a-z]/.test(lettersOnly);
  const hasUppercase = /[A-Z]/.test(lettersOnly);
  if (!hasUppercase || hasLowercase) return text;

  // Convert all-caps generated lines to title case at render time.
  return trimmed
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function isTikTokFont(fontFamily: string): boolean {
  return (
    fontFamily.includes("var(--font-tiktok") ||
    fontFamily.includes("TikTok Sans")
  );
}

function isItalianaFont(fontFamily: string): boolean {
  return (
    fontFamily.includes("var(--font-italiana") ||
    fontFamily.includes("Italiana") ||
    fontFamily.includes(OVERLAY_ITALIANA_FONT_FAMILY)
  );
}

/**
 * Compute per-line CSS styles for a text overlay. When the overlay has
 * structured `lines` and a `fontPairing`, each line gets its own typography
 * derived from the template definition and pairing. Falls back to a single
 * legacy line when `lines` is absent.
 */
export function computeOverlayLineStyles(
  overlay: PreviewTextOverlay,
  baseFontSizePx: number
): ComputedOverlayLineStyle[] {
  const useNoBackgroundTextShadow =
    overlay.templatePattern === "simple" && overlay.background === "none";

  // Legacy / simple path: no structured lines
  if (!overlay.lines || overlay.lines.length === 0) {
    return [
      {
        text: normalizeOverlayLineText(overlay.text),
        fontFamily: PREVIEW_TEXT_OVERLAY_FONT_FAMILY[overlay.font],
        fontWeight: 400,
        fontSize: baseFontSizePx,
        textTransform: "none",
        fontStyle: "normal",
        lineHeight: PREVIEW_TEXT_OVERLAY_LINE_HEIGHT,
        letterSpacing: PREVIEW_TEXT_OVERLAY_LETTER_SPACING,
        textShadow: useNoBackgroundTextShadow
          ? PREVIEW_TEXT_OVERLAY_NO_BACKGROUND_TEXT_SHADOW
          : "none",
        marginTop: 0,
        marginBottom: 0
      }
    ];
  }

  const pairing = overlay.fontPairing
    ? OVERLAY_FONT_PAIRINGS[overlay.fontPairing]
    : null;
  const template = overlay.templatePattern
    ? getOverlayTemplate(overlay.templatePattern)
    : null;
  const hasMultipleFontOptions = Boolean(
    overlay.fontPairing &&
    overlay.lines.some(
      (line) => line.fontRole !== (overlay.lines?.[0]?.fontRole ?? "body")
    )
  );
  const multiFontSizeBoost = hasMultipleFontOptions ? 1.2 : 1;

  return overlay.lines.map((line, index) => {
    const templateLine = template?.lines[index];
    const roleStyle = pairing?.[line.fontRole];
    const scale = templateLine?.fontSizeScale ?? 1.0;
    const resolvedFontFamily =
      roleStyle?.fontFamily ?? PREVIEW_TEXT_OVERLAY_FONT_FAMILY[overlay.font];
    const isRougeScript =
      resolvedFontFamily.includes("var(--font-rouge") ||
      resolvedFontFamily.includes("Rouge Script");
    const useTikTokUppercase = isTikTokFont(resolvedFontFamily);
    const baseWeight = roleStyle?.fontWeight ?? 400;
    const fontSize =
      baseFontSizePx * scale * multiFontSizeBoost * (isRougeScript ? 1.25 : 1);
    const templateLayout = template?.layout;
    const marginTop =
      index === 0
        ? 0
        : (templateLayout?.lineMarginTopByIndex?.[index] ??
          templateLayout?.defaultLineMarginTop ??
          10);
    const marginBottom = templateLayout?.lineMarginBottomByIndex?.[index] ?? 0;
    const roleLetterSpacing =
      templateLayout?.letterSpacingByRole?.[line.fontRole];
    const resolvedLetterSpacing = isItalianaFont(resolvedFontFamily)
      ? line.fontRole === "headline"
        ? "-0.05em"
        : PREVIEW_TEXT_OVERLAY_LETTER_SPACING
      : (roleLetterSpacing ?? PREVIEW_TEXT_OVERLAY_LETTER_SPACING);

    return {
      text: useTikTokUppercase
        ? line.text.toUpperCase()
        : isRougeScript
          ? line.text.toLowerCase()
          : normalizeOverlayLineText(line.text),
      fontFamily: resolvedFontFamily,
      fontWeight: isRougeScript ? Math.max(baseWeight, 700) : baseWeight,
      fontSize,
      textTransform: isRougeScript
        ? "none"
        : useTikTokUppercase
          ? "uppercase"
          : (templateLine?.textTransform ?? "none"),
      fontStyle: isRougeScript
        ? "normal"
        : (templateLine?.fontStyle ?? "normal"),
      lineHeight:
        PREVIEW_TEXT_OVERLAY_LINE_HEIGHT *
        (templateLayout?.lineHeightScale ?? 1),
      letterSpacing: resolvedLetterSpacing,
      textShadow: useNoBackgroundTextShadow
        ? PREVIEW_TEXT_OVERLAY_NO_BACKGROUND_TEXT_SHADOW
        : "none",
      marginTop,
      marginBottom
    };
  });
}
