import type { ListingTemplateRenderedItem } from "@web/src/lib/domain/media/templateRender/types";

export type TemplateRenderStreamEvent =
  | { type: "item"; item: ListingTemplateRenderedItem }
  | { type: "done"; failedTemplateIds: string[] }
  | { type: "error"; message: string };

export async function* streamTemplateRenderEvents(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<TemplateRenderStreamEvent> {
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

      const event = JSON.parse(payload) as TemplateRenderStreamEvent;
      yield event;
    }
  }
}
