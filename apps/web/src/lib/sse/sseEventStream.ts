export async function* streamSseEvents<T>(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<T> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return;
    }

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.split("\n").find((entry) => entry.startsWith("data:"));
      if (!line) {
        continue;
      }

      const payload = line.replace(/^data:\s*/, "");
      if (!payload) {
        continue;
      }

      try {
        yield JSON.parse(payload) as T;
      } catch {
        // Ignore malformed chunks and continue consuming the stream.
      }
    }
  }
}

