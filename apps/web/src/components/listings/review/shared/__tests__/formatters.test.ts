import {
  formatDateDisplay,
  formatListingPrice,
  parseReviewDate,
  roundBathroomsToHalfStep,
  toNullableNumber,
  toNullableString
} from "@web/src/components/listings/review/shared/formatters";
import { format } from "date-fns";

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

  describe("parseReviewDate", () => {
    it("parses yyyy-MM-dd values", () => {
      expect(format(parseReviewDate("2026-03-01")!, "yyyy-MM-dd")).toBe(
        "2026-03-01"
      );
    });

    it("parses ISO datetime values by date prefix", () => {
      expect(
        format(parseReviewDate("2026-03-01T00:00:00.000Z")!, "yyyy-MM-dd")
      ).toBe("2026-03-01");
    });

    it("parses legacy month-name date values", () => {
      expect(format(parseReviewDate("Mar 1, 2026")!, "yyyy-MM-dd")).toBe(
        "2026-03-01"
      );
    });

    it("parses legacy slash date values", () => {
      expect(format(parseReviewDate("3/1/2026")!, "yyyy-MM-dd")).toBe(
        "2026-03-01"
      );
    });

    it("parses legacy weekday values without year", () => {
      expect(format(parseReviewDate("Sunday, Mar 1")!, "MM-dd")).toBe("03-01");
    });

    it("parses legacy weekday values with no comma and ordinal day", () => {
      expect(format(parseReviewDate("Sunday Mar 1st")!, "MM-dd")).toBe("03-01");
    });

    it("returns undefined for invalid values", () => {
      expect(parseReviewDate("not-a-date")).toBeUndefined();
    });
  });

  describe("formatDateDisplay", () => {
    it("formats yyyy-MM-dd values", () => {
      expect(formatDateDisplay("2026-03-01")).toBe("Mar 1, 2026");
    });

    it("formats ISO datetime values", () => {
      expect(formatDateDisplay("2026-03-01T00:00:00.000Z")).toBe("Mar 1, 2026");
    });

    it("formats legacy month-name values", () => {
      expect(formatDateDisplay("Mar 1, 2026")).toBe("Mar 1, 2026");
    });

    it("formats legacy weekday values without year", () => {
      expect(formatDateDisplay("Sunday, Mar 1")).toBe(
        `Mar 1, ${new Date().getFullYear()}`
      );
    });

    it("returns original string when date is invalid", () => {
      expect(formatDateDisplay("not-a-date")).toBe("not-a-date");
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
