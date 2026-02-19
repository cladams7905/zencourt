export function parseJsonArray(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "");

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const start = trimmed.indexOf("[");
    const end = trimmed.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) {
      throw error;
    }
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

export function extractTextDelta(payload: {
  type?: string;
  delta?: { type?: string; text?: string };
}): string | null {
  if (payload.type !== "content_block_delta") {
    return null;
  }
  if (payload.delta?.type !== "text_delta") {
    return null;
  }
  return payload.delta.text ?? null;
}

export function validateGeneratedItems(items: unknown): asserts items is unknown[] {
  if (!Array.isArray(items)) {
    throw new Error("AI response was not a JSON array");
  }

  if (items.length === 0) {
    throw new Error("AI response did not contain any items");
  }
}
