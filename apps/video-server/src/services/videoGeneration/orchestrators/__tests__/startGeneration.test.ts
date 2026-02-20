import { startGenerationOrchestrator } from "@/services/videoGeneration/orchestrators/startGeneration";

describe("startGenerationOrchestrator", () => {
  const baseRequest = {
    videoId: "video-1",
    jobIds: ["job-1", "job-2"],
    listingId: "listing-1",
    userId: "user-1",
    callbackUrl: "https://example.vercel.app/api/v1/webhooks/video"
  };

  it("dispatches jobs and returns success counts", async () => {
    const deps = {
      findJobsByIds: jest.fn().mockResolvedValue([
        { id: "job-1", videoGenBatchId: "video-1" },
        { id: "job-2", videoGenBatchId: "video-1" }
      ]),
      markVideoProcessing: jest.fn().mockResolvedValue(undefined),
      markJobFailed: jest.fn().mockResolvedValue(undefined),
      markVideoFailed: jest.fn().mockResolvedValue(undefined),
      dispatchJob: jest.fn().mockResolvedValue(undefined),
      runWithConcurrency: jest.fn(async (items, _limit, handler) => {
        for (const item of items as Array<{ id: string }>) {
          await handler(item);
        }
      })
    };

    const result = await startGenerationOrchestrator(baseRequest, deps);
    expect(result).toEqual({ jobsStarted: 2, failedJobs: [] });
    expect(deps.markVideoProcessing).toHaveBeenCalledWith("video-1");
  });

  it("marks failures and throws when all jobs fail", async () => {
    const deps = {
      findJobsByIds: jest.fn().mockResolvedValue([
        { id: "job-1", videoGenBatchId: "video-1" }
      ]),
      markVideoProcessing: jest.fn().mockResolvedValue(undefined),
      markJobFailed: jest.fn().mockResolvedValue(undefined),
      markVideoFailed: jest.fn().mockResolvedValue(undefined),
      dispatchJob: jest.fn().mockRejectedValue(new Error("dispatch failed")),
      runWithConcurrency: jest.fn(async (items, _limit, handler) => {
        for (const item of items as Array<{ id: string }>) {
          await handler(item);
        }
      })
    };

    await expect(startGenerationOrchestrator(baseRequest, deps)).rejects.toThrow(
      "All video jobs failed to dispatch"
    );
    expect(deps.markJobFailed).toHaveBeenCalledWith("job-1", "dispatch failed");
    expect(deps.markVideoFailed).toHaveBeenCalledWith(
      "video-1",
      "All video jobs failed to dispatch"
    );
  });

  it("throws when no jobs are found", async () => {
    const deps = {
      findJobsByIds: jest.fn().mockResolvedValue([]),
      markVideoProcessing: jest.fn(),
      markJobFailed: jest.fn(),
      markVideoFailed: jest.fn(),
      dispatchJob: jest.fn(),
      runWithConcurrency: jest.fn()
    };

    await expect(startGenerationOrchestrator(baseRequest, deps)).rejects.toThrow(
      "No video jobs found"
    );
    expect(deps.markVideoProcessing).not.toHaveBeenCalled();
  });

  it("throws when a job belongs to a different video", async () => {
    const deps = {
      findJobsByIds: jest.fn().mockResolvedValue([
        { id: "job-1", videoGenBatchId: "other-video" }
      ]),
      markVideoProcessing: jest.fn(),
      markJobFailed: jest.fn(),
      markVideoFailed: jest.fn(),
      dispatchJob: jest.fn(),
      runWithConcurrency: jest.fn()
    };

    await expect(startGenerationOrchestrator(baseRequest, deps)).rejects.toThrow(
      "Jobs do not belong to video"
    );
  });

  it("returns partial success when some jobs fail", async () => {
    const deps = {
      findJobsByIds: jest.fn().mockResolvedValue([
        { id: "job-1", videoGenBatchId: "video-1" },
        { id: "job-2", videoGenBatchId: "video-1" }
      ]),
      markVideoProcessing: jest.fn().mockResolvedValue(undefined),
      markJobFailed: jest.fn().mockResolvedValue(undefined),
      markVideoFailed: jest.fn().mockResolvedValue(undefined),
      dispatchJob: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("job-2 failed")),
      runWithConcurrency: jest.fn(async (items, _limit, handler) => {
        for (const item of items as Array<{ id: string }>) {
          await handler(item);
        }
      })
    };

    const result = await startGenerationOrchestrator(baseRequest, deps);
    expect(result.jobsStarted).toBe(1);
    expect(result.failedJobs).toEqual(["job-2"]);
    expect(deps.markVideoFailed).not.toHaveBeenCalled();
  });
});
