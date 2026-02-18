import { normalizeAudienceSegment } from "@web/src/server/services/communityData/shared/audience";

describe("normalizeAudienceSegment", () => {
  it("returns undefined for empty input", () => {
    expect(normalizeAudienceSegment()).toBeUndefined();
    expect(normalizeAudienceSegment("")).toBeUndefined();
  });

  it("normalizes aliases", () => {
    expect(normalizeAudienceSegment("relocators")).toBe("investors_relocators");
    expect(normalizeAudienceSegment("first_time_buyers")).toBe(
      "first_time_homebuyers"
    );
  });

  it("returns normalized segment when already valid", () => {
    expect(normalizeAudienceSegment("growing_families")).toBe(
      "growing_families"
    );
  });

  it("returns undefined for unknown segments", () => {
    expect(normalizeAudienceSegment("unknown_segment")).toBeUndefined();
  });
});
