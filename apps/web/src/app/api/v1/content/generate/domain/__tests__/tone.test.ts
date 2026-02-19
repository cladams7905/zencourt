import {
  buildWritingStyleDescription,
  getWritingToneLabel,
  normalizeToneLevel
} from "../tone";

describe("content/generate tone domain", () => {
  it("normalizes invalid tone level values to default", () => {
    expect(normalizeToneLevel(null)).toBe(3);
    expect(normalizeToneLevel(0)).toBe(3);
    expect(normalizeToneLevel(6)).toBe(3);
    expect(normalizeToneLevel(Number.NaN)).toBe(3);
  });

  it("returns labels for normalized tone", () => {
    expect(getWritingToneLabel(4)).toContain("Formal");
    expect(getWritingToneLabel(999)).toContain("Conversational");
  });

  it("composes style description from preset and custom values", () => {
    expect(buildWritingStyleDescription(null, null)).toContain("Friendly, conversational");
    expect(buildWritingStyleDescription(2, "Keep it playful")).toContain("Keep it playful");
  });
});
