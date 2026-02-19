/**
 * @jest-environment node
 */

import { encodeSseEvent, makeSseStreamHeaders } from "../sseEncoder";

describe("encodeSseEvent", () => {
  const decoder = new TextDecoder();

  it("produces a correctly framed SSE message", () => {
    const result = encodeSseEvent({ type: "delta" });
    expect(decoder.decode(result)).toBe('data: {"type":"delta"}\n\n');
  });

  it("handles nested objects", () => {
    const result = encodeSseEvent({ type: "done", meta: { model: "test", batch_size: 2 } });
    const decoded = decoder.decode(result);
    expect(decoded).toBe('data: {"type":"done","meta":{"model":"test","batch_size":2}}\n\n');
  });

  it("handles special characters in string values", () => {
    const result = encodeSseEvent({ text: 'say "hello" & goodbye' });
    const decoded = decoder.decode(result);
    expect(decoded).toContain("say");
    expect(decoded).toContain("hello");
    // Must still be valid parseable JSON in the data frame
    const payload = decoded.replace(/^data: /, "").replace(/\n\n$/, "");
    expect(() => JSON.parse(payload)).not.toThrow();
    expect(JSON.parse(payload).text).toBe('say "hello" & goodbye');
  });

  it("returns a Uint8Array", () => {
    const result = encodeSseEvent({ type: "delta", text: "hi" });
    expect(result).toBeInstanceOf(Uint8Array);
  });
});

describe("makeSseStreamHeaders", () => {
  it("returns the expected header map", () => {
    expect(makeSseStreamHeaders()).toEqual({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });
  });

  it("returns a new object on each call", () => {
    const a = makeSseStreamHeaders();
    const b = makeSseStreamHeaders();
    expect(a).not.toBe(b);
  });
});
