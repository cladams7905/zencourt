import {
  handleCancelVideo,
  handleGenerateVideo
} from "@/routes/video/orchestrators/handlers";

describe("video route orchestrators", () => {
  it("starts generation and returns accepted response payload", async () => {
    const result = await handleGenerateVideo(
      {
        videoId: "video-1",
        jobIds: ["job-1"],
        listingId: "listing-1",
        userId: "user-1",
        callbackUrl: "https://example.vercel.app/api/v1/webhooks/video"
      },
      {
        generationService: {
          startGeneration: jest.fn().mockResolvedValue({ jobsStarted: 1 })
        }
      }
    );

    expect(result.status).toBe(202);
    expect(result.body).toEqual({
      success: true,
      message: "Video generation started",
      videoId: "video-1",
      jobsStarted: 1
    });
  });

  it("cancels by explicit video IDs when provided", async () => {
    const cancelVideosByIds = jest.fn().mockResolvedValue(2);
    const cancelVideosByListing = jest.fn().mockResolvedValue(0);
    const cancelJobsByListingId = jest.fn().mockResolvedValue(3);

    const result = await handleCancelVideo(
      {
        listingId: "listing-1",
        videoIds: ["video-1", "video-2"],
        reason: "Canceled by user"
      },
      {
        cancelVideosByIds,
        cancelVideosByListing,
        cancelJobsByListingId
      }
    );

    expect(cancelVideosByIds).toHaveBeenCalledWith(
      ["video-1", "video-2"],
      "Canceled by user"
    );
    expect(cancelVideosByListing).not.toHaveBeenCalled();
    expect(result.body).toEqual({
      success: true,
      canceledVideos: 2,
      canceledJobs: 3
    });
  });

  it("falls back to listing cancel when videoIds is empty", async () => {
    const cancelVideosByIds = jest.fn();
    const cancelVideosByListing = jest.fn().mockResolvedValue(5);
    const cancelJobsByListingId = jest.fn().mockResolvedValue(2);

    const result = await handleCancelVideo(
      { listingId: "listing-1", videoIds: [], reason: "Canceled by user" },
      { cancelVideosByIds, cancelVideosByListing, cancelJobsByListingId }
    );

    expect(cancelVideosByListing).toHaveBeenCalledWith("listing-1", "Canceled by user");
    expect(cancelVideosByIds).not.toHaveBeenCalled();
    expect(result.body.canceledVideos).toBe(5);
  });
});
