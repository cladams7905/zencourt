import {
  requestDashboardContentStream,
  streamDashboardContentEvents
} from "@web/src/components/dashboard/domain/dashboardContentStream";
import { TextEncoder } from "util";

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

  it("throws API error message when response is not ok", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Bad request" })
    } as never);
    Object.defineProperty(global, "fetch", {
      writable: true,
      value: fetchMock
    });

    await expect(
      requestDashboardContentStream({
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
      })
    ).rejects.toThrow("Bad request");
  });

  it("throws fallback error when failed response has invalid json", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error("invalid json");
      }
    } as never);
    Object.defineProperty(global, "fetch", {
      writable: true,
      value: fetchMock
    });

    await expect(
      requestDashboardContentStream({
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
      })
    ).rejects.toThrow("Failed to generate content");
  });

  it("throws when stream reader is unavailable", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      body: null
    } as never);
    Object.defineProperty(global, "fetch", {
      writable: true,
      value: fetchMock
    });

    await expect(
      requestDashboardContentStream({
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
      })
    ).rejects.toThrow("Streaming response not available");
  });

  it("ignores non-data and empty data SSE parts", async () => {
    const reader = createReaderFromChunks([
      "event: ping\n\n",
      "data: \n\n",
      'data: {"type":"done","items":[]}\n\n'
    ]);

    const events: unknown[] = [];
    for await (const event of streamDashboardContentEvents(reader)) {
      events.push(event);
    }

    expect(events).toEqual([{ type: "done", items: [] }]);
  });
});
