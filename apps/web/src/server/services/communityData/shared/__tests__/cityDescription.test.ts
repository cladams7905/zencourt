import {
  buildCityDescriptionPrompt,
  parseCityDescriptionResult
} from "@web/src/server/services/communityData/shared/cityDescription";

describe("shared cityDescription", () => {
  it("builds expected prompt", () => {
    const prompt = buildCityDescriptionPrompt("Austin", "TX");
    expect(prompt).toContain("Austin, TX");
  });

  it("parses structured JSON response", () => {
    const result = parseCityDescriptionResult({
      text: JSON.stringify({
        description: "A great city",
        citations: [{ title: "Ref", url: "https://ref.test", source: "Ref" }]
      })
    });

    expect(result).toEqual({
      description: "A great city",
      citations: [{ title: "Ref", url: "https://ref.test", source: "Ref" }]
    });
  });

  it("falls back to plain text", () => {
    const result = parseCityDescriptionResult({
      text: " Austin is vibrant. ",
      citations: [{ title: "Source", url: "https://src.test", source: "S" }]
    });

    expect(result).toEqual({
      description: "Austin is vibrant.",
      citations: [{ title: "Source", url: "https://src.test", source: "S" }]
    });
  });

  it("returns null when text is missing", () => {
    const result = parseCityDescriptionResult({ text: null });
    expect(result).toBeNull();
  });
});
