const DEFAULT_STYLE =
  "Friendly, conversational, and professional with clear, concise language";

export const DEFAULT_TONE_LEVEL = 3;

export const TONE_DESCRIPTIONS: Record<number, string> = {
  1: "Very informal, uses texting lingo, and uses lots of exclamation points",
  2: "Informal, warm, relaxed, approachable voice, uses some exclamation points",
  3: "Conversational, casual-professional tone, clear and concise, uses some exclamation points",
  4: "Formal, polished, authoritative tone with minimal slang",
  5: "Very formal, highly professional and structured voice"
};

export function normalizeToneLevel(level: number | null): number {
  if (level === null || Number.isNaN(level)) {
    return DEFAULT_TONE_LEVEL;
  }
  if (level < 1 || level > 5) {
    return DEFAULT_TONE_LEVEL;
  }
  return Math.round(level);
}

export function getWritingToneLabel(level: number | null): string {
  const normalized = normalizeToneLevel(level);
  return TONE_DESCRIPTIONS[normalized] || TONE_DESCRIPTIONS[DEFAULT_TONE_LEVEL];
}

export function buildWritingStyleDescription(
  preset: number | string | null,
  custom: string | null
): string {
  if (!preset && !custom) {
    return DEFAULT_STYLE;
  }

  const parts: string[] = [];

  if (preset !== null && preset !== undefined && preset !== "") {
    const numeric = normalizeToneLevel(Number(preset));
    parts.push(TONE_DESCRIPTIONS[numeric] || DEFAULT_STYLE);
  }

  if (custom) {
    parts.push(custom);
  }

  return parts.join(". ");
}
