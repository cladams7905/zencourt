import {
  parseCancelVideoRequest,
  parseGenerateVideoRequest
} from "@/routes/video/domain/requests";

describe("video route request parsers", () => {
  it("parses generate request with required fields", () => {
    const parsed = parseGenerateVideoRequest({
      batchId: "batch-1",
      jobIds: ["job-1", "job-2"],
      listingId: "listing-1",
      userId: "user-1",
      callbackUrl: "https://example.vercel.app/api/v1/webhooks/video"
    });

    expect(parsed).toEqual({
      batchId: "batch-1",
      jobIds: ["job-1", "job-2"],
      listingId: "listing-1",
      userId: "user-1",
      callbackUrl: "https://example.vercel.app/api/v1/webhooks/video"
    });
  });

  it("throws when generate request is missing required fields", () => {
    expect(() =>
      parseGenerateVideoRequest({
        batchId: "batch-1",
        jobIds: []
      })
    ).toThrow("jobIds must be a non-empty array");

    expect(() =>
      parseGenerateVideoRequest({
        batchId: "batch-1",
        jobIds: ["job-1"],
        listingId: "listing-1",
        userId: "user-1"
        // callbackUrl missing
      })
    ).toThrow("Invalid request");
  });

  it("parses cancel request and normalizes reason", () => {
    const parsed = parseCancelVideoRequest({
      batchId: "batch-1",
      reason: "  user canceled  "
    });

    expect(parsed).toEqual({
      batchId: "batch-1",
      reason: "user canceled"
    });
  });

  it("uses default reason for cancel request", () => {
    const parsed = parseCancelVideoRequest({
      batchId: "batch-1"
    });

    expect(parsed.reason).toBe("Canceled by user");
  });
});
