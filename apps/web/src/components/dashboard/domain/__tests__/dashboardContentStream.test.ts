import {
  requestDashboardContentStream,
  streamDashboardContentEvents
} from "@web/src/components/dashboard/domain/dashboardContentStream";
import { TextDecoder, TextEncoder } from "util";

function createReaderFromChunks(chunks: string[]) {
  let index = 0;
  return {
    read: jest.fn(async () => {
      if (index >= chunks.length) {
        return { done: true, value: undefined };
      }
      const value = new TextEncoder().encode(chunks[index]);
      index += 1;
      return { done: false, value };
    })
  } as unknown as ReadableStreamDefaultReader<Uint8Array>;
}

describe("dashboardContentStream", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(global, "TextDecoder", {
      writable: true,
      value: TextDecoder
    });
    Object.defineProperty(global, "TextEncoder", {
      writable: true,
      value: TextEncoder
    });
  });

  it("streams SSE events", async () => {
    const reader = createReaderFromChunks([
      'data: {"type":"delta","text":"["}\n\n',
      'data: {"type":"done","items":[]}\n\n'
    ]);

    const events: unknown[] = [];
    for await (const event of streamDashboardContentEvents(reader)) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: "delta", text: "[" },
      { type: "done", items: [] }
    ]);
  });

  it("requests stream and returns reader", async () => {
    const mockReader = createReaderFromChunks([]);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    } as never);
    Object.defineProperty(global, "fetch", {
      writable: true,
      value: fetchMock
    });

    const reader = await requestDashboardContentStream({
      category: "market_insights",
      filterFocus: "Market Insights",
      agentProfile: {
        agent_name: "Alex",
        brokerage_name: "Zencourt",
        agent_title: "Realtor",
        city: "Austin",
        state: "TX",
        zip_code: "78701",
        service_areas: "",
        writing_style_description: "Friendly"
      },
      signal: new AbortController().signal
    });

    expect(fetchMock).toHaveBeenCalled();
    expect(reader).toBe(mockReader);
  });
});
