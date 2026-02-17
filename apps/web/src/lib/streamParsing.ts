/**
 * Progressively extracts complete JSON objects from a partially-streamed
 * JSON array string. Handles nested objects, escaped strings, and
 * incomplete trailing data gracefully.
 */
export function extractJsonItemsFromStream<
  T extends Record<string, unknown> = Record<string, unknown>
>(text: string): T[] {
  const items: T[] = [];

  let arrayStarted = false;
  let inString = false;
  let escape = false;
  let braceDepth = 0;
  let objectStart = -1;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (!arrayStarted) {
      if (char === "[") {
        arrayStarted = true;
      }
      continue;
    }

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (braceDepth === 0) {
        objectStart = i;
      }
      braceDepth += 1;
    } else if (char === "}") {
      braceDepth -= 1;
      if (braceDepth === 0 && objectStart >= 0) {
        const objectText = text.slice(objectStart, i + 1);
        try {
          const parsed = JSON.parse(objectText);
          if (parsed && typeof parsed === "object") {
            items.push(parsed as T);
          }
        } catch {
          // Ignore incomplete/invalid JSON objects
        }
        objectStart = -1;
      }
    }
  }

  return items;
}
