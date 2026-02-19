export async function consumeSseStream<T>(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: T) => void | Promise<void>
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part
        .split("\n")
        .find((entry) => entry.startsWith("data:"));
      if (!line) continue;

      const payload = line.replace(/^data:\s*/, "");
      if (!payload) continue;

      let event: T;
      try {
        event = JSON.parse(payload) as T;
      } catch {
        continue;
      }

      await onEvent(event);
    }
  }
}
