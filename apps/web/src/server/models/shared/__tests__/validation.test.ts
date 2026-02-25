import {
  requireNonEmptyString,
  requireUserId,
  requireListingId,
  requireContentId,
  requireMediaId
} from "@web/src/server/models/shared/validation";

describe("validation", () => {
  describe("requireNonEmptyString", () => {
    it("returns value when non-empty", () => {
      expect(requireNonEmptyString("a", "err")).toBe("a");
      expect(requireNonEmptyString("  x  ", "err")).toBe("  x  ");
    });

    it("throws when empty string", () => {
      expect(() => requireNonEmptyString("", "msg")).toThrow("msg");
    });

    it("throws when whitespace-only", () => {
      expect(() => requireNonEmptyString("   ", "msg")).toThrow("msg");
    });

    it("throws when null/undefined-like (falsy)", () => {
      expect(() =>
        requireNonEmptyString(null as unknown as string, "msg")
      ).toThrow("msg");
      expect(() =>
        requireNonEmptyString(undefined as unknown as string, "msg")
      ).toThrow("msg");
    });
  });

  describe("requireUserId", () => {
    it("returns userId when non-empty", () => {
      expect(requireUserId("user-1", "err")).toBe("user-1");
    });

    it("throws with custom message when empty", () => {
      expect(() => requireUserId("", "User required")).toThrow("User required");
    });
  });

  describe("requireListingId", () => {
    it("returns listingId when non-empty", () => {
      expect(requireListingId("listing-1", "err")).toBe("listing-1");
    });

    it("throws when empty", () => {
      expect(() => requireListingId("", "Listing required")).toThrow(
        "Listing required"
      );
    });
  });

  describe("requireContentId", () => {
    it("returns contentId when non-empty", () => {
      expect(requireContentId("content-1", "err")).toBe("content-1");
    });

    it("throws when empty", () => {
      expect(() => requireContentId("  ", "Content required")).toThrow(
        "Content required"
      );
    });
  });

  describe("requireMediaId", () => {
    it("returns mediaId when non-empty", () => {
      expect(requireMediaId("media-1", "err")).toBe("media-1");
    });

    it("throws when empty", () => {
      expect(() => requireMediaId("", "Media required")).toThrow(
        "Media required"
      );
    });
  });
});
