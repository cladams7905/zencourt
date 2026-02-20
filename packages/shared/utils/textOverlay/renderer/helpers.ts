import { OVERLAY_ITALIANA_FONT_FAMILY } from "../assets/index";

export function normalizeOverlayLineText(text: string): string {
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

export function isTikTokFont(fontFamily: string): boolean {
  return (
    fontFamily.includes("var(--font-tiktok") ||
    fontFamily.includes("TikTok Sans")
  );
}

export function isRougeFont(fontFamily: string): boolean {
  return (
    fontFamily.includes("var(--font-rouge") ||
    fontFamily.includes("Rouge Script")
  );
}

export function isItalianaFont(fontFamily: string): boolean {
  return (
    fontFamily.includes("var(--font-italiana") ||
    fontFamily.includes("Italiana") ||
    fontFamily.includes(OVERLAY_ITALIANA_FONT_FAMILY)
  );
}

export function resolveDisplayText(
  text: string,
  resolvedFontFamily: string
): string {
  if (isTikTokFont(resolvedFontFamily)) {
    return text.toUpperCase();
  }
  if (isRougeFont(resolvedFontFamily)) {
    return text.toLowerCase();
  }
  return normalizeOverlayLineText(text);
}
