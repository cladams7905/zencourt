import { buildSummary } from "../summary";
import { NOT_AVAILABLE } from "../transforms";

describe("marketData/domain/summary", () => {
  it("builds a detailed summary when market fields are available", () => {
    const result = buildSummary(
      { city: "Austin", state: "TX", zip_code: "73301" },
      "$450,000",
      "4.2%",
      "1,020",
      "2.1"
    );

    expect(result.summary).toContain("Austin home prices are around $450,000");
    expect(result.summary).toContain("Inventory sits near 2.1 months");
  });

  it("falls back to a generic summary when primary fields are unavailable", () => {
    const result = buildSummary(
      { city: "Austin", state: "TX", zip_code: "73301" },
      NOT_AVAILABLE,
      NOT_AVAILABLE,
      NOT_AVAILABLE,
      NOT_AVAILABLE
    );

    expect(result.summary).toBe("Market snapshot for Austin, TX.");
  });
});
