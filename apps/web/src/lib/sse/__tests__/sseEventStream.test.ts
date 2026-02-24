import { streamSseEvents } from "@web/src/lib/sse/sseEventStream";
import { TextDecoder } from "util";

function buildReaderFromChunks(chunks: string[]) {
  let index = 0;
  return {
    read: async () => {
      if (index >= chunks.length) {
        return { done: true, value: undefined };
      }
      const chunk = chunks[index] ?? "";
      index += 1;
      return { done: false, value: Uint8Array.from(Buffer.from(chunk)) };
    }
  } as ReadableStreamDefaultReader<Uint8Array>;
}

describe("streamSseEvents", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "TextDecoder", {
      writable: true,
      value: TextDecoder
    });
  });

  it("parses data events and ignores malformed payloads", async () => {
    const reader = buildReaderFromChunks([
      'data: {"type":"delta","text":"a"}\n\n',
      'data: not-json\n\n',
      'data: {"type":"done"}\n\n'
    ]);

    const events: Array<Record<string, unknown>> = [];
    for await (const event of streamSseEvents<Record<string, unknown>>(reader)) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: "delta", text: "a" },
      { type: "done" }
    ]);
  });
});
