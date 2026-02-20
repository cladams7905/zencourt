import {
  parseCancelVideoRequest,
  parseGenerateVideoRequest
} from "@/routes/video/domain/requests";

describe("video route request parsers", () => {
  it("parses generate request with required fields", () => {
    const parsed = parseGenerateVideoRequest({
      videoId: "video-1",
      jobIds: ["job-1", "job-2"],
      listingId: "listing-1",
      userId: "user-1"
    });

    expect(parsed).toEqual({
      videoId: "video-1",
      jobIds: ["job-1", "job-2"],
      listingId: "listing-1",
      userId: "user-1"
    });
  });

  it("throws when generate request is missing required fields", () => {
    expect(() =>
      parseGenerateVideoRequest({
        videoId: "video-1",
        jobIds: []
      })
    ).toThrow("jobIds must be a non-empty array");
  });

  it("parses cancel request and normalizes reason", () => {
    const parsed = parseCancelVideoRequest({
      listingId: "listing-1",
      videoIds: ["video-1", " ", "video-2"],
      reason: "  user canceled  "
    });

    expect(parsed).toEqual({
      listingId: "listing-1",
      videoIds: ["video-1", "video-2"],
      reason: "user canceled"
    });
  });

  it("uses default reason for cancel request", () => {
    const parsed = parseCancelVideoRequest({
      listingId: "listing-1"
    });

    expect(parsed.reason).toBe("Canceled by user");
  });
});
