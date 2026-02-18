import {
  formatCurrencyUsd,
  formatNumberUs,
  formatCountWithNoun
} from "@web/src/lib/core/formatting/number";

describe("number formatting", () => {
  it("formats currency with fallback", () => {
    expect(formatCurrencyUsd(125000)).toBe("$125,000");
    expect(formatCurrencyUsd(null, "N/A")).toBe("N/A");
  });

  it("formats numbers with fallback", () => {
    expect(formatNumberUs(1200)).toBe("1,200");
    expect(formatNumberUs(undefined, "N/A")).toBe("N/A");
  });

  it("formats count with noun and pluralization", () => {
    expect(formatCountWithNoun(1, "bed")).toBe("1 bed");
    expect(formatCountWithNoun(2, "bath")).toBe("2 baths");
    expect(formatCountWithNoun(0, "room", "")).toBe("");
  });
});
