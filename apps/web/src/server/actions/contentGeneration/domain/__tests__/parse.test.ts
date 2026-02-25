import {
  parseJsonArray,
  extractTextDelta,
  validateGeneratedItems
} from "@web/src/server/actions/contentGeneration/domain/parse";

describe("contentGeneration/domain/parse", () => {
  describe("parseJsonArray", () => {
    it("parses a plain JSON array string", () => {
      expect(parseJsonArray('[{"a":1}]')).toEqual([{ a: 1 }]);
      expect(parseJsonArray('  [{"hook":"hi"}]  ')).toEqual([{ hook: "hi" }]);
    });

    it("strips markdown code fence and parses", () => {
      expect(parseJsonArray('```json\n[{"x":1}]\n```')).toEqual([{ x: 1 }]);
      expect(parseJsonArray('```json\n[1,2,3]\n```')).toEqual([1, 2, 3]);
    });

    it("extracts array from text when direct parse fails", () => {
      const text = "Here is the result:\n[{\"id\":1}]";
      expect(parseJsonArray(text)).toEqual([{ id: 1 }]);
    });

    it("throws when input is not valid JSON and no array bounds found", () => {
      expect(() => parseJsonArray("not json")).toThrow();
      expect(() => parseJsonArray("")).toThrow();
    });
  });

  describe("extractTextDelta", () => {
    it("returns text when type is content_block_delta and delta.type is text_delta", () => {
      expect(
        extractTextDelta({
          type: "content_block_delta",
          delta: { type: "text_delta", text: "hello" }
        })
      ).toBe("hello");
    });

    it("returns null when type is not content_block_delta", () => {
      expect(
        extractTextDelta({
          type: "message_delta",
          delta: { type: "text_delta", text: "hello" }
        })
      ).toBeNull();
    });

    it("returns null when delta.type is not text_delta", () => {
      expect(
        extractTextDelta({
          type: "content_block_delta",
          delta: { type: "something_else" }
        })
      ).toBeNull();
    });

    it("returns null for missing delta or text", () => {
      expect(extractTextDelta({ type: "content_block_delta" })).toBeNull();
      expect(
        extractTextDelta({
          type: "content_block_delta",
          delta: { type: "text_delta" }
        })
      ).toBeNull();
    });
  });

  describe("validateGeneratedItems", () => {
    it("does not throw for non-empty array", () => {
      expect(() => validateGeneratedItems([{ hook: "x" }])).not.toThrow();
      expect(() => validateGeneratedItems([1, 2])).not.toThrow();
    });

    it("throws when value is not an array", () => {
      expect(() => validateGeneratedItems(null)).toThrow(
        "AI response was not a JSON array"
      );
      expect(() => validateGeneratedItems({})).toThrow(
        "AI response was not a JSON array"
      );
      expect(() => validateGeneratedItems("[]")).toThrow(
        "AI response was not a JSON array"
      );
    });

    it("throws when array is empty", () => {
      expect(() => validateGeneratedItems([])).toThrow(
        "AI response did not contain any items"
      );
    });
  });
});
