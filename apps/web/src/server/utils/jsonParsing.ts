export function parsePossiblyWrappedJson(raw: unknown): unknown | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw !== "string") {
    return raw;
  }

  try {
    return JSON.parse(raw);
  } catch {
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }
    try {
      return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }
}
