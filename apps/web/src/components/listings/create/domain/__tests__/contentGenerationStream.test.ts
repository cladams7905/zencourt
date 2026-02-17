import {
  requestContentGenerationStream,
  streamContentGenerationEvents
} from "@web/src/components/listings/create/domain/contentGenerationStream";
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

describe("contentGenerationStream", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    Object.defineProperty(globalThis, "TextDecoder", {
      writable: true,
      value: TextDecoder
    });
  });

  it("requests generation stream with expected payload and returns reader", async () => {
    const mockReader = { read: jest.fn() };
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    });
    Object.defineProperty(globalThis, "fetch", {
      writable: true,
      value: fetchMock
    });

    const reader = await requestContentGenerationStream({
      listingId: "listing-1",
      subcategory: "new_listing",
      mediaType: "video",
      focus: "New Listing",
      generationNonce: "nonce-1",
      signal: new AbortController().signal
    });

    expect(reader).toBeDefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/listings/listing-1/content/generate",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })
    );
    const call = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(call.body).toBe(
      JSON.stringify({
        subcategory: "new_listing",
        media_type: "video",
        focus: "New Listing",
        generation_nonce: "nonce-1"
      })
    );
  });

  it("throws error message from non-ok response payload", async () => {
    Object.defineProperty(globalThis, "fetch", {
      writable: true,
      value: jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "bad request" })
      })
    });

    await expect(
      requestContentGenerationStream({
        listingId: "listing-1",
        subcategory: "new_listing",
        mediaType: "video",
        focus: "",
        generationNonce: "",
        signal: new AbortController().signal
      })
    ).rejects.toThrow("bad request");
  });

  it("throws when streaming body is unavailable", async () => {
    Object.defineProperty(globalThis, "fetch", {
      writable: true,
      value: jest.fn().mockResolvedValue({
        ok: true,
        body: null
      })
    });

    await expect(
      requestContentGenerationStream({
        listingId: "listing-1",
        subcategory: "new_listing",
        mediaType: "video",
        focus: "",
        generationNonce: "",
        signal: new AbortController().signal
      })
    ).rejects.toThrow("Streaming response not available");
  });

  it("streams SSE events across chunk boundaries and ignores non-data entries", async () => {
    const reader = buildReaderFromChunks([
      'data: {"type":"delta","text":"["}\n\n',
      "event: ping\n\n",
      "data: \n\n",
      'data: {"type":"delta","text":"{\\"hook\\":\\"A\\"}"}\n\n',
      'data: {"type":"done","items":[]}\n\n'
    ]);

    const events = [];
    for await (const event of streamContentGenerationEvents(reader)) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: "delta", text: "[" },
      { type: "delta", text: '{"hook":"A"}' },
      { type: "done", items: [] }
    ]);
  });
});
