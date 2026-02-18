import {
  formatCount,
  formatCurrency,
  formatPercent,
  getRentalData,
  getSaleData,
  normalizePayload,
  NOT_AVAILABLE,
  pickNumber,
  pickObservationValue,
  sanitizeMarketField
} from "../transforms";

describe("marketData/domain/transforms", () => {
  it("picks the first numeric value from candidate keys", () => {
    expect(pickNumber({ a: null, b: "$123,456", c: 7 }, ["a", "b", "c"])).toBe(
      123456
    );
    expect(pickObservationValue({ value: "4.5" })).toBe(4.5);
    expect(pickNumber({ a: "x" }, ["a"])).toBe(0);
  });

  it("formats values and handles not-available values", () => {
    expect(formatCurrency(250000)).toBe("$250,000");
    expect(formatCurrency(null)).toBe(NOT_AVAILABLE);
    expect(formatPercent(0.123)).toBe("12.3%");
    expect(formatPercent(12.3)).toBe("12.3%");
    expect(formatPercent(null)).toBe(NOT_AVAILABLE);
    expect(formatCount(12345)).toBe("12,345");
    expect(formatCount(null)).toBe(NOT_AVAILABLE);
  });

  it("sanitizes market fields", () => {
    expect(sanitizeMarketField("  good  ")).toBe("good");
    expect(sanitizeMarketField("   ")).toBe(NOT_AVAILABLE);
    expect(sanitizeMarketField(null)).toBe(NOT_AVAILABLE);
    expect(sanitizeMarketField(42)).toBe("42");
  });

  it("normalizes payload and sub-objects", () => {
    expect(normalizePayload([{ saleData: { a: 1 } }, { saleData: { b: 2 } }]))
      .toEqual({ saleData: { a: 1 } });
    expect(normalizePayload({ rentalData: { x: 1 } })).toEqual({
      rentalData: { x: 1 }
    });
    expect(normalizePayload("bad" as unknown as Record<string, unknown>)).toEqual(
      {}
    );

    expect(getSaleData({ saleData: { count: 1 } })).toEqual({ count: 1 });
    expect(getSaleData({ saleData: null })).toEqual({});
    expect(getRentalData({ rentalData: { count: 2 } })).toEqual({ count: 2 });
    expect(getRentalData({ rentalData: null })).toEqual({});
  });
});
