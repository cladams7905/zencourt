import {
  formatListingPrice,
  roundBathroomsToHalfStep,
  toNullableNumber,
  toNullableString
} from "@web/src/components/listings/review/shared/formatters";

describe("review formatters", () => {
  describe("toNullableString", () => {
    it("returns trimmed string when non-empty", () => {
      expect(toNullableString("  Main St  ")).toBe("Main St");
    });

    it("returns null for empty input", () => {
      expect(toNullableString("   ")).toBeNull();
    });
  });

  describe("toNullableNumber", () => {
    it("returns number for valid numeric input", () => {
      expect(toNullableNumber(" 42.5 ")).toBe(42.5);
    });

    it("returns null for empty or invalid values", () => {
      expect(toNullableNumber(" ")).toBeNull();
      expect(toNullableNumber("abc")).toBeNull();
    });
  });

  describe("formatListingPrice", () => {
    it("formats numbers as USD-style whole dollar string", () => {
      expect(formatListingPrice("850000")).toBe("$850,000");
    });

    it("strips non-digits before formatting", () => {
      expect(formatListingPrice("$1,234,500")).toBe("$1,234,500");
    });

    it("returns empty string when no digits are present", () => {
      expect(formatListingPrice("abc")).toBe("");
    });
  });

  describe("roundBathroomsToHalfStep", () => {
    it("rounds to nearest 0.5", () => {
      expect(roundBathroomsToHalfStep(2.24)).toBe(2);
      expect(roundBathroomsToHalfStep(2.26)).toBe(2.5);
      expect(roundBathroomsToHalfStep(2.75)).toBe(3);
    });
  });
});
