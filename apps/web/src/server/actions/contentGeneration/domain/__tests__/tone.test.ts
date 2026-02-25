import {
  normalizeToneLevel,
  getWritingToneLabel,
  buildWritingStyleDescription,
  DEFAULT_TONE_LEVEL,
  TONE_DESCRIPTIONS
} from "@web/src/server/actions/contentGeneration/domain/tone";

describe("contentGeneration/domain/tone", () => {
  describe("normalizeToneLevel", () => {
    it("returns DEFAULT_TONE_LEVEL for null or NaN", () => {
      expect(normalizeToneLevel(null)).toBe(DEFAULT_TONE_LEVEL);
      expect(normalizeToneLevel(Number.NaN)).toBe(DEFAULT_TONE_LEVEL);
    });

    it("clamps out-of-range values to DEFAULT_TONE_LEVEL", () => {
      expect(normalizeToneLevel(0)).toBe(DEFAULT_TONE_LEVEL);
      expect(normalizeToneLevel(6)).toBe(DEFAULT_TONE_LEVEL);
      expect(normalizeToneLevel(-1)).toBe(DEFAULT_TONE_LEVEL);
    });

    it("returns rounded value for valid 1-5 range", () => {
      expect(normalizeToneLevel(1)).toBe(1);
      expect(normalizeToneLevel(5)).toBe(5);
      expect(normalizeToneLevel(3.4)).toBe(3);
      expect(normalizeToneLevel(3.6)).toBe(4);
    });
  });

  describe("getWritingToneLabel", () => {
    it("returns description for normalized level", () => {
      expect(getWritingToneLabel(3)).toBe(TONE_DESCRIPTIONS[3]);
      expect(getWritingToneLabel(null)).toBe(TONE_DESCRIPTIONS[DEFAULT_TONE_LEVEL]);
    });
  });

  describe("buildWritingStyleDescription", () => {
    it("returns default style when preset and custom are falsy", () => {
      expect(buildWritingStyleDescription(null, null)).toContain("Friendly");
      expect(buildWritingStyleDescription(null, "")).toContain("Friendly");
    });

    it("includes preset description when preset is provided", () => {
      const result = buildWritingStyleDescription(4, null);
      expect(result).toContain("Formal");
    });

    it("includes custom text when custom is provided", () => {
      const result = buildWritingStyleDescription(null, "Use short sentences.");
      expect(result).toContain("Use short sentences.");
    });

    it("combines preset and custom with period separator", () => {
      const result = buildWritingStyleDescription(2, "Be warm.");
      expect(result).toContain(TONE_DESCRIPTIONS[2]);
      expect(result).toContain("Be warm.");
      expect(result).toMatch(/\. .+/);
    });
  });
});
