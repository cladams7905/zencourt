import {
  extractTextDelta,
  parseJsonArray,
  validateGeneratedItems
} from "../parse";

describe("content/generate parse domain", () => {
  it("parses json arrays wrapped in markdown fences", () => {
    expect(parseJsonArray("```json\n[{\"hook\":\"A\"}]\n```"))
      .toEqual([{ hook: "A" }]);
  });

  it("falls back to first array slice when prefixed text exists", () => {
    expect(parseJsonArray("Result:\n[{\"hook\":\"A\"}]\nThanks"))
      .toEqual([{ hook: "A" }]);
  });

  it("extracts only text deltas", () => {
    expect(extractTextDelta({ type: "content_block_delta", delta: { type: "text_delta", text: "abc" } }))
      .toBe("abc");
    expect(extractTextDelta({ type: "message_start" })).toBeNull();
  });

  it("throws for invalid generated items", () => {
    expect(() => validateGeneratedItems({})).toThrow(
      "AI response was not a JSON array"
    );
    expect(() => validateGeneratedItems([])).toThrow(
      "AI response did not contain any items"
    );
    expect(() => validateGeneratedItems([{}])).not.toThrow();
  });
});
