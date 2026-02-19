import { extractJsonItemsFromStream } from "@web/src/lib/sse/extractJsonItemsFromStream";

describe("extractJsonItemsFromStream", () => {
  it("parses complete objects from a streamed array", () => {
    const result = extractJsonItemsFromStream<{ id: number }>(
      '[{"id":1},{"id":2}]'
    );

    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("ignores incomplete trailing objects", () => {
    const result = extractJsonItemsFromStream<{ id: number }>(
      '[{"id":1},{"id":'
    );

    expect(result).toEqual([{ id: 1 }]);
  });

  it("handles nested objects and escaped quotes in strings", () => {
    const result = extractJsonItemsFromStream<{ note: string; nested: { ok: boolean } }>(
      '[{"note":"he said \\\"hi\\\"","nested":{"ok":true}}]'
    );

    expect(result).toEqual([{ note: 'he said "hi"', nested: { ok: true } }]);
  });

  it("returns empty array when no array start token exists", () => {
    expect(extractJsonItemsFromStream('{"id":1}')).toEqual([]);
  });
});
