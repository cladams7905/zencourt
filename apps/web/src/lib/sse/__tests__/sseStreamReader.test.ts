/**
 * @jest-environment node
 */

import { consumeSseStream } from "../sseStreamReader";

function makeStream(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    }
  });
}

describe("consumeSseStream", () => {
  it("calls onEvent once for a single complete SSE frame", async () => {
    const stream = makeStream('data: {"type":"delta","text":"hi"}\n\n');
    const events: unknown[] = [];
    await consumeSseStream(stream, (e) => { events.push(e); });
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: "delta", text: "hi" });
  });

  it("calls onEvent multiple times for multiple frames in one chunk", async () => {
    const stream = makeStream(
      'data: {"type":"delta","text":"a"}\n\ndata: {"type":"delta","text":"b"}\n\n'
    );
    const events: unknown[] = [];
    await consumeSseStream(stream, (e) => { events.push(e); });
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: "delta", text: "a" });
    expect(events[1]).toEqual({ type: "delta", text: "b" });
  });

  it("correctly handles a frame split across two chunks", async () => {
    const stream = makeStream(
      'data: {"type":"del',
      'ta","text":"split"}\n\n'
    );
    const events: unknown[] = [];
    await consumeSseStream(stream, (e) => { events.push(e); });
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: "delta", text: "split" });
  });

  it("skips frames without a data: line", async () => {
    const stream = makeStream("comment: ignore this\n\n");
    const events: unknown[] = [];
    await consumeSseStream(stream, (e) => { events.push(e); });
    expect(events).toHaveLength(0);
  });

  it("skips frames where data: payload is empty", async () => {
    const stream = makeStream("data: \n\n");
    const events: unknown[] = [];
    await consumeSseStream(stream, (e) => { events.push(e); });
    expect(events).toHaveLength(0);
  });

  it("skips frames where JSON parsing fails without throwing", async () => {
    const stream = makeStream("data: not-json\n\n");
    const events: unknown[] = [];
    await expect(
      consumeSseStream(stream, (e) => { events.push(e); })
    ).resolves.toBeUndefined();
    expect(events).toHaveLength(0);
  });

  it("resolves when the stream ends", async () => {
    const stream = makeStream('data: {"type":"done"}\n\n');
    await expect(consumeSseStream(stream, () => {})).resolves.toBeUndefined();
  });

  it("awaits async onEvent callbacks before processing the next frame", async () => {
    const stream = makeStream(
      'data: {"n":1}\n\ndata: {"n":2}\n\n'
    );
    const order: number[] = [];
    await consumeSseStream<{ n: number }>(stream, async (e) => {
      await new Promise<void>((r) => setTimeout(r, 5));
      order.push(e.n);
    });
    expect(order).toEqual([1, 2]);
  });
});
