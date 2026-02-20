import {
  readJsonBodySafe,
  requireNonEmptyParam,
  requireNonEmptyString,
  requireNonEmptyStringArray
} from "..";

describe("api/validation", () => {
  it("validates non-empty params and strings", () => {
    expect(requireNonEmptyParam("  abc ")).toBe("abc");
    expect(requireNonEmptyParam("   ")).toBeNull();
    expect(requireNonEmptyString("  value ", "field")).toBe("value");
    expect(() => requireNonEmptyString("", "field")).toThrow(
      "field is required"
    );
  });

  it("validates and normalizes string arrays", () => {
    expect(requireNonEmptyStringArray([" a ", "b", "   ", 1], "tags")).toEqual([
      "a",
      "b"
    ]);
    expect(() => requireNonEmptyStringArray([], "tags")).toThrow(
      "tags must be a non-empty array"
    );
    expect(() => requireNonEmptyStringArray(["   "], "tags")).toThrow(
      "tags must contain at least one valid string value"
    );
  });

  it("reads json bodies safely", async () => {
    await expect(
      readJsonBodySafe({ json: async () => ({ ok: true }) })
    ).resolves.toEqual({ ok: true });
    await expect(
      readJsonBodySafe({ json: async () => "not-object" })
    ).resolves.toBeNull();
    await expect(
      readJsonBodySafe({
        json: async () => {
          throw new Error("bad");
        }
      })
    ).resolves.toBeNull();
  });
});
