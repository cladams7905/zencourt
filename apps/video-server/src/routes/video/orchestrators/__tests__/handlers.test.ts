import {
  handleCancelVideo,
  handleGenerateVideo
} from "@/routes/video/orchestrators/handlers";

describe("video route orchestrators", () => {
  it("starts generation and returns accepted response payload", async () => {
    const result = await handleGenerateVideo(
      {
        batchId: "batch-1",
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
      batchId: "batch-1",
      jobsStarted: 1
    });
  });

  it("cancels by batch id", async () => {
    const cancelGenerationBatch = jest.fn().mockResolvedValue({
      canceledBatches: 1,
      canceledJobs: 2
    });

    const result = await handleCancelVideo(
      {
        batchId: "batch-1",
        reason: "Canceled by user"
      },
      {
        cancelGenerationBatch
      }
    );

    expect(cancelGenerationBatch).toHaveBeenCalledWith(
      "batch-1",
      "Canceled by user"
    );
    expect(result.body).toEqual({
      success: true,
      canceledBatches: 1,
      canceledJobs: 2
    });
  });
});
