import {
  isRecord,
  normalizeOptionalString,
  normalizeOptionalNumber,
  normalizeOptionalBoolean,
  normalizeOptionalStringArray,
  normalizeNullableString,
  normalizeNullableNumber,
  normalizeNullableBoolean,
  normalizeNullableStringArray
} from "@web/src/server/utils/normalization";

describe("normalization utils", () => {
  it("normalizes optional primitives", () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord([])).toBe(false);

    expect(normalizeOptionalString("  hi  ")).toBe("hi");
    expect(normalizeOptionalString("   ")).toBeUndefined();

    expect(normalizeOptionalNumber("42")).toBe(42);
    expect(normalizeOptionalNumber("x")).toBeUndefined();

    expect(normalizeOptionalBoolean("true")).toBe(true);
    expect(normalizeOptionalBoolean("False")).toBe(false);
    expect(normalizeOptionalBoolean("x")).toBeUndefined();

    expect(normalizeOptionalStringArray([" a ", "", "b"])).toEqual(["a", "b"]);
    expect(normalizeOptionalStringArray("x")).toBeUndefined();
  });

  it("preserves null for nullable helpers", () => {
    expect(normalizeNullableString(null)).toBeNull();
    expect(normalizeNullableNumber(null)).toBeNull();
    expect(normalizeNullableBoolean(null)).toBeNull();
    expect(normalizeNullableStringArray(null)).toBeNull();
  });
});
