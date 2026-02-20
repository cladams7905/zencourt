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

export interface InlineTextSegment {
  text: string;
  italic: boolean;
}

const INLINE_ITALIC_PATTERN = /\*([^*]+)\*/g;

export function parseInlineItalicSegments(text: string): InlineTextSegment[] {
  if (!text) {
    return [{ text: "", italic: false }];
  }

  const segments: InlineTextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_ITALIC_PATTERN)) {
    const matchedText = match[0];
    const italicText = match[1];
    const matchIndex = match.index ?? -1;
    if (!matchedText || !italicText || matchIndex < 0) {
      continue;
    }

    if (matchIndex > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, matchIndex),
        italic: false
      });
    }

    segments.push({ text: italicText, italic: true });
    lastIndex = matchIndex + matchedText.length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), italic: false });
  }

  return segments.length > 0 ? segments : [{ text, italic: false }];
}
