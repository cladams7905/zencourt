import {
  hasMeaningfulValue,
  cleanSummaryText,
  interpolateTemplate,
  extractSectionText,
  extractBulletSection,
  resolveContentMediaType,
  normalizeListingSubcategory
} from "@web/src/lib/ai/prompts/engine/promptHelpers";

describe("promptHelpers", () => {
  it("validates meaningful values", () => {
    expect(hasMeaningfulValue("hello")).toBe(true);
    expect(hasMeaningfulValue(" N/A ")).toBe(false);
    expect(hasMeaningfulValue("null")).toBe(false);
    expect(hasMeaningfulValue("   ")).toBe(false);
    expect(hasMeaningfulValue(undefined)).toBe(false);
  });

  it("cleans summary text and interpolates templates", () => {
    expect(cleanSummaryText("A — B   C")).toBe("A , B C");
    expect(interpolateTemplate("Hi {name}, {missing}", { name: "Sam" })).toBe(
      "Hi Sam, {missing}"
    );
  });

  it("extracts section and bullet content", () => {
    const lines = [
      "## Header",
      "**Who they are:**",
      "",
      "People moving quickly.",
      "### Key Topics",
      "Extra",
      "**Core pain points:**",
      "- Limited inventory",
      "- Rate volatility",
      "Not a bullet"
    ];

    expect(extractSectionText(lines, "**Who they are:**")).toBe(
      "People moving quickly."
    );
    expect(extractBulletSection(lines, "**Core pain points:**")).toEqual([
      "Limited inventory",
      "Rate volatility"
    ]);
  });

  it("resolves media type and listing subcategory safely", () => {
    expect(resolveContentMediaType({ media_type: "video" })).toBe("video");
    expect(resolveContentMediaType({ media_type: "image" })).toBe("image");
    expect(resolveContentMediaType(undefined)).toBe("image");

    expect(normalizeListingSubcategory("new_listing")).toBe("new_listing");
    expect(normalizeListingSubcategory("unknown")).toBeNull();
    expect(normalizeListingSubcategory(null)).toBeNull();
  });
});
