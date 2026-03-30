import { cancelBatchGenerationOrchestrator } from "@/services/videoGeneration/orchestrators/cancelBatchGeneration";

describe("cancelBatchGenerationOrchestrator", () => {
  const runwayJob = {
    id: "job-1",
    videoGenBatchId: "batch-1",
    status: "processing",
    requestId: "task-1",
    generationSettings: { provider: "runway", model: "veo3.1_fast" }
  } as any;

  it("cancels active runway tasks before marking the batch canceled", async () => {
    const cancelProviderTask = jest.fn().mockResolvedValue(undefined);
    const releaseProviderTask = jest.fn();
    const markBatchCanceled = jest.fn().mockResolvedValue(1);

    const result = await cancelBatchGenerationOrchestrator("batch-1", "Canceled", {
      findCancelableJobsByBatchId: jest.fn().mockResolvedValue([
        runwayJob,
        {
          id: "job-2",
          videoGenBatchId: "batch-1",
          status: "pending",
          requestId: null,
          generationSettings: { provider: "runway", model: "veo3.1_fast" }
        },
        {
          id: "job-3",
          videoGenBatchId: "batch-1",
          status: "processing",
          requestId: "external-1",
          generationSettings: { provider: "kling", model: "kling1.6" }
        },
        {
          id: "job-4",
          videoGenBatchId: "batch-1",
          status: "processing",
          requestId: "wave-1",
          generationSettings: { provider: "wavespeed", model: "veo3.1_fast" }
        }
      ]),
      cancelProviderTask,
      releaseProviderTask,
      markBatchCanceled
    });

    expect(cancelProviderTask).toHaveBeenCalledTimes(1);
    expect(cancelProviderTask).toHaveBeenCalledWith("task-1");
    expect(releaseProviderTask).toHaveBeenCalledWith("runway", "task-1");
    expect(releaseProviderTask).toHaveBeenCalledWith("wavespeed", "wave-1");
    expect(markBatchCanceled).toHaveBeenCalledWith("batch-1", "Canceled");
    expect(result).toEqual({ canceledBatches: 1, canceledJobs: 4 });
  });

  it("does not mark the batch canceled when provider cancellation fails", async () => {
    const markBatchCanceled = jest.fn();

    await expect(
      cancelBatchGenerationOrchestrator("batch-1", "Canceled", {
        findCancelableJobsByBatchId: jest.fn().mockResolvedValue([runwayJob]),
        cancelProviderTask: jest.fn().mockRejectedValue(new Error("cancel failed")),
        releaseProviderTask: jest.fn(),
        markBatchCanceled
      })
    ).rejects.toThrow("cancel failed");

    expect(markBatchCanceled).not.toHaveBeenCalled();
  });

  it("cancels gen4.5 runway jobs the same way as legacy runway jobs", async () => {
    const cancelProviderTask = jest.fn().mockResolvedValue(undefined);
    const releaseProviderTask = jest.fn();
    const markBatchCanceled = jest.fn().mockResolvedValue(1);

    await cancelBatchGenerationOrchestrator("batch-1", "Canceled", {
      findCancelableJobsByBatchId: jest.fn().mockResolvedValue([
        {
          ...runwayJob,
          id: "job-gen45",
          requestId: "task-gen45",
          generationSettings: { provider: "runway", model: "gen4.5" }
        }
      ]),
      cancelProviderTask,
      releaseProviderTask,
      markBatchCanceled
    });

    expect(cancelProviderTask).toHaveBeenCalledWith("task-gen45");
    expect(releaseProviderTask).toHaveBeenCalledWith("runway", "task-gen45");
  });
});
