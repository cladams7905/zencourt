import {
  requireContentId,
  requireListingId,
  requireMediaId,
  requireNonEmptyString,
  requireUserId
} from "@web/src/server/actions/shared/validation";

describe("validation", () => {
  it("returns value when non-empty", () => {
    expect(requireNonEmptyString("abc", "err")).toBe("abc");
  });

  it("throws when empty", () => {
    expect(() => requireNonEmptyString("", "missing")).toThrow("missing");
    expect(() => requireNonEmptyString("   ", "missing")).toThrow("missing");
  });

  it("specialized validators delegate", () => {
    expect(requireUserId("u1", "bad")).toBe("u1");
    expect(requireListingId("l1", "bad")).toBe("l1");
    expect(requireContentId("c1", "bad")).toBe("c1");
    expect(requireMediaId("m1", "bad")).toBe("m1");
  });
});
