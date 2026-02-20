import { handleProviderSuccessOrchestrator } from "@/services/videoGeneration/orchestrators/providerSuccess";
import { downloadBufferWithRetry } from "@/services/videoGeneration/domain/downloadWithRetry";

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

  it("falls back to listing image when thumbnailUrl download fails", async () => {
    const mockDownload = downloadBufferWithRetry as jest.Mock;
    mockDownload
      .mockResolvedValueOnce({ buffer: Buffer.from("video"), checksumSha256: "cs" }) // video download
      .mockRejectedValueOnce(new Error("thumbnail 404")) // thumbnail URL fails
      .mockResolvedValueOnce({ buffer: Buffer.from("listing-img"), checksumSha256: "cs2" }); // listing image fallback

    const uploadFile = jest
      .fn()
      .mockResolvedValueOnce("https://cdn/video.mp4")
      .mockResolvedValueOnce("https://cdn/thumb.jpg");

    await handleProviderSuccessOrchestrator(
      baseJob,
      "https://provider/video.mp4",
      { durationSeconds: 4, thumbnailUrl: "https://provider/thumb.jpg" },
      {
        getVideoContext: jest.fn().mockResolvedValue({ userId: "user-1", listingId: "listing-1" }),
        uploadFile,
        markJobCompleted: jest.fn().mockResolvedValue(undefined),
        sendJobCompletionWebhook: jest.fn().mockResolvedValue(undefined),
        evaluateJobCompletion: jest.fn().mockResolvedValue({ allCompleted: false, failedJobs: 0 }),
        markVideoCompleted: jest.fn(),
        getJobDurationSeconds: () => 4
      }
    );

    // Video + listing image fallback uploaded
    expect(uploadFile).toHaveBeenCalledTimes(2);
  });

  it("does not upload thumbnail when all thumbnail downloads fail", async () => {
    const mockDownload = downloadBufferWithRetry as jest.Mock;
    mockDownload
      .mockResolvedValueOnce({ buffer: Buffer.from("video"), checksumSha256: "cs" })
      .mockRejectedValueOnce(new Error("thumb failed"))
      .mockRejectedValueOnce(new Error("listing image failed"));

    const uploadFile = jest.fn().mockResolvedValue("https://cdn/video.mp4");

    await handleProviderSuccessOrchestrator(
      baseJob,
      "https://provider/video.mp4",
      { durationSeconds: 4, thumbnailUrl: "https://provider/thumb.jpg" },
      {
        getVideoContext: jest.fn().mockResolvedValue({ userId: "user-1", listingId: "listing-1" }),
        uploadFile,
        markJobCompleted: jest.fn().mockResolvedValue(undefined),
        sendJobCompletionWebhook: jest.fn().mockResolvedValue(undefined),
        evaluateJobCompletion: jest.fn().mockResolvedValue({ allCompleted: false, failedJobs: 0 }),
        markVideoCompleted: jest.fn(),
        getJobDurationSeconds: () => 4
      }
    );

    // Only video uploaded, no thumbnail
    expect(uploadFile).toHaveBeenCalledTimes(1);
  });

  it("does not mark video completed when not all jobs done", async () => {
    const mockDownload = downloadBufferWithRetry as jest.Mock;
    mockDownload.mockResolvedValue({ buffer: Buffer.from("video"), checksumSha256: "cs" });

    const markVideoCompleted = jest.fn();

    await handleProviderSuccessOrchestrator(
      baseJob,
      "https://provider/video.mp4",
      { durationSeconds: 4 },
      {
        getVideoContext: jest.fn().mockResolvedValue({ userId: "user-1", listingId: "listing-1" }),
        uploadFile: jest.fn().mockResolvedValue("https://cdn/video.mp4"),
        markJobCompleted: jest.fn().mockResolvedValue(undefined),
        sendJobCompletionWebhook: jest.fn().mockResolvedValue(undefined),
        evaluateJobCompletion: jest.fn().mockResolvedValue({ allCompleted: false, failedJobs: 0 }),
        markVideoCompleted,
        getJobDurationSeconds: () => 4
      }
    );

    expect(markVideoCompleted).not.toHaveBeenCalled();
  });

  it("marks video completed with plural message when multiple jobs failed", async () => {
    const mockDownload = downloadBufferWithRetry as jest.Mock;
    mockDownload.mockResolvedValue({ buffer: Buffer.from("video"), checksumSha256: "cs" });

    const uploadFile = jest
      .fn()
      .mockResolvedValueOnce("https://cdn/video.mp4")
      .mockResolvedValueOnce("https://cdn/thumb.jpg");
    const markVideoCompleted = jest.fn().mockResolvedValue(undefined);

    await handleProviderSuccessOrchestrator(
      baseJob,
      "https://provider/video.mp4",
      { durationSeconds: 4 },
      {
        getVideoContext: jest.fn().mockResolvedValue({ userId: "user-1", listingId: "listing-1" }),
        uploadFile,
        markJobCompleted: jest.fn().mockResolvedValue(undefined),
        sendJobCompletionWebhook: jest.fn().mockResolvedValue(undefined),
        evaluateJobCompletion: jest.fn().mockResolvedValue({ allCompleted: true, failedJobs: 2 }),
        markVideoCompleted,
        getJobDurationSeconds: () => 4
      }
    );

    expect(markVideoCompleted).toHaveBeenCalledWith("video-1", "2 clips failed");
  });

  it("marks video completed with singular message when one job failed", async () => {
    const mockDownload = downloadBufferWithRetry as jest.Mock;
    mockDownload.mockResolvedValue({ buffer: Buffer.from("video"), checksumSha256: "cs" });

    const uploadFile = jest
      .fn()
      .mockResolvedValueOnce("https://cdn/video.mp4")
      .mockResolvedValueOnce("https://cdn/thumb.jpg");
    const markVideoCompleted = jest.fn().mockResolvedValue(undefined);

    await handleProviderSuccessOrchestrator(
      baseJob,
      "https://provider/video.mp4",
      { durationSeconds: 4 },
      {
        getVideoContext: jest.fn().mockResolvedValue({ userId: "user-1", listingId: "listing-1" }),
        uploadFile,
        markJobCompleted: jest.fn().mockResolvedValue(undefined),
        sendJobCompletionWebhook: jest.fn().mockResolvedValue(undefined),
        evaluateJobCompletion: jest.fn().mockResolvedValue({ allCompleted: true, failedJobs: 1 }),
        markVideoCompleted,
        getJobDurationSeconds: () => 4
      }
    );

    expect(markVideoCompleted).toHaveBeenCalledWith("video-1", "1 clip failed");
  });

  it("uses provider thumbnail when thumbnailUrl downloads successfully", async () => {
    const mockDownload = downloadBufferWithRetry as jest.Mock;
    mockDownload
      .mockResolvedValueOnce({ buffer: Buffer.from("video"), checksumSha256: "cs" })
      .mockResolvedValueOnce({ buffer: Buffer.from("provider-thumb"), checksumSha256: "cs2" });

    const uploadFile = jest
      .fn()
      .mockResolvedValueOnce("https://cdn/video.mp4")
      .mockResolvedValueOnce("https://cdn/thumb.jpg");

    await handleProviderSuccessOrchestrator(
      baseJob,
      "https://provider/video.mp4",
      { durationSeconds: 4, thumbnailUrl: "https://provider/thumb.jpg" },
      {
        getVideoContext: jest.fn().mockResolvedValue({ userId: "user-1", listingId: "listing-1" }),
        uploadFile,
        markJobCompleted: jest.fn().mockResolvedValue(undefined),
        sendJobCompletionWebhook: jest.fn().mockResolvedValue(undefined),
        evaluateJobCompletion: jest.fn().mockResolvedValue({ allCompleted: false, failedJobs: 0 }),
        markVideoCompleted: jest.fn(),
        getJobDurationSeconds: () => 4
      }
    );

    expect(uploadFile).toHaveBeenCalledTimes(2);
  });
});
