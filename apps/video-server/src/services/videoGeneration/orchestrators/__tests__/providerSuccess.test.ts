import { handleProviderSuccessOrchestrator } from "@/services/videoGeneration/orchestrators/providerSuccess";

jest.mock("@/services/videoGeneration/domain/downloadWithRetry", () => ({
  downloadBufferWithRetry: jest.fn().mockResolvedValue({
    buffer: Buffer.from("video-bytes"),
    checksumSha256: "checksum"
  })
}));

describe("handleProviderSuccessOrchestrator", () => {
  const baseJob = {
    id: "job-1",
    videoGenBatchId: "video-1",
    generationSettings: {
      model: "veo3.1_fast",
      orientation: "vertical",
      aiDirections: "",
      imageUrls: ["https://listing-image.jpg"],
      prompt: "prompt",
      category: "general",
      sortOrder: 0
    },
    metadata: { duration: 4 }
  } as never;

  it("persists outputs and marks parent completed when all jobs done", async () => {
    const uploadFile = jest
      .fn()
      .mockResolvedValueOnce("https://cdn/video.mp4")
      .mockResolvedValueOnce("https://cdn/thumb.jpg");
    const markJobCompleted = jest.fn().mockResolvedValue(undefined);
    const sendJobCompletionWebhook = jest.fn().mockResolvedValue(undefined);
    const evaluateJobCompletion = jest
      .fn()
      .mockResolvedValue({ allCompleted: true, failedJobs: 0 });
    const markVideoCompleted = jest.fn().mockResolvedValue(undefined);

    await handleProviderSuccessOrchestrator(
      baseJob,
      "https://provider/video.mp4",
      { durationSeconds: 4 },
      {
        getVideoContext: jest
          .fn()
          .mockResolvedValue({ userId: "user-1", listingId: "listing-1" }),
        uploadFile,
        markJobCompleted,
        sendJobCompletionWebhook,
        evaluateJobCompletion,
        markVideoCompleted,
        getJobDurationSeconds: () => 4
      }
    );

    expect(uploadFile).toHaveBeenCalledTimes(2);
    expect(markJobCompleted).toHaveBeenCalledTimes(1);
    expect(sendJobCompletionWebhook).toHaveBeenCalledTimes(1);
    expect(markVideoCompleted).toHaveBeenCalledWith("video-1", null);
  });
});
