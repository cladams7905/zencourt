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
    expect(isRecord(null)).toBe(false);

    expect(normalizeOptionalString("  hi  ")).toBe("hi");
    expect(normalizeOptionalString("   ")).toBeUndefined();
    expect(normalizeOptionalString(42)).toBeUndefined();

    expect(normalizeOptionalNumber("42")).toBe(42);
    expect(normalizeOptionalNumber("x")).toBeUndefined();
    expect(normalizeOptionalNumber(Number.NaN)).toBeUndefined();
    expect(normalizeOptionalNumber(false)).toBeUndefined();

    expect(normalizeOptionalBoolean("true")).toBe(true);
    expect(normalizeOptionalBoolean(true)).toBe(true);
    expect(normalizeOptionalBoolean("False")).toBe(false);
    expect(normalizeOptionalBoolean("x")).toBeUndefined();
    expect(normalizeOptionalBoolean(1)).toBeUndefined();

    expect(normalizeOptionalStringArray([" a ", "", "b"])).toEqual(["a", "b"]);
    expect(normalizeOptionalStringArray([" ", ""])).toBeUndefined();
    expect(normalizeOptionalStringArray("x")).toBeUndefined();
  });

  it("preserves null for nullable helpers", () => {
    expect(normalizeNullableString(null)).toBeNull();
    expect(normalizeNullableNumber(null)).toBeNull();
    expect(normalizeNullableBoolean(null)).toBeNull();
    expect(normalizeNullableStringArray(null)).toBeNull();
    expect(normalizeNullableString("  ok ")).toBe("ok");
    expect(normalizeNullableNumber("7")).toBe(7);
    expect(normalizeNullableBoolean("false")).toBe(false);
    expect(normalizeNullableStringArray(["a", " "])).toEqual(["a"]);
  });
});
