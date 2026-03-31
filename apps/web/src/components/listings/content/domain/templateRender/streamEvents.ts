import type { ListingTemplateRenderedItem } from "@web/src/lib/domain/media/templateRender/types";
import { streamSseEvents } from "@web/src/lib/sse/sseEventStream";

export type TemplateRenderStreamEvent =
  | { type: "item"; item: ListingTemplateRenderedItem }
  | { type: "done"; failedTemplateIds: string[] }
  | { type: "error"; message: string };

export async function* streamTemplateRenderEvents(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<TemplateRenderStreamEvent> {
  yield* streamSseEvents<TemplateRenderStreamEvent>(reader);
}
