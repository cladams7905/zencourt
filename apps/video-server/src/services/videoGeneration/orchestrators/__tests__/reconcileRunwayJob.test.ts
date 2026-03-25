import { reconcileRunwayJobOrchestrator } from "@/services/videoGeneration/orchestrators/reconcileRunwayJob";

describe("reconcileRunwayJobOrchestrator", () => {
  const baseJob = {
    id: "job-1",
    videoGenBatchId: "batch-1",
    status: "processing",
    requestId: "task-1",
    metadata: { duration: 4 }
  } as never;

  const baseDeps = () => ({
    retrieveTask: jest.fn(),
    handleProviderSuccess: jest.fn().mockResolvedValue(undefined),
    markJobFailed: jest.fn().mockResolvedValue(undefined),
    markVideoFailed: jest.fn().mockResolvedValue(undefined),
    sendJobFailureWebhook: jest.fn().mockResolvedValue(undefined),
    getJobDurationSeconds: jest.fn().mockReturnValue(4)
  });

  it("completes the job when the runway task succeeded", async () => {
    const deps = baseDeps();
    deps.retrieveTask.mockResolvedValue({
      id: "task-1",
      status: "SUCCEEDED",
      createdAt: "2026-03-20T00:00:00.000Z",
      output: ["https://runway.example/video.mp4"]
    });

    await reconcileRunwayJobOrchestrator(baseJob, deps);

    expect(deps.handleProviderSuccess).toHaveBeenCalledWith(
      baseJob,
      "https://runway.example/video.mp4",
      expect.objectContaining({ durationSeconds: 4, thumbnailUrl: null })
    );
    expect(deps.markJobFailed).not.toHaveBeenCalled();
  });

  it("marks the job and batch failed when the runway task failed", async () => {
    const deps = baseDeps();
    deps.retrieveTask.mockResolvedValue({
      id: "task-1",
      status: "FAILED",
      createdAt: "2026-03-20T00:00:00.000Z",
      failure: "provider failed"
    });

    await reconcileRunwayJobOrchestrator(baseJob, deps);

    expect(deps.markJobFailed).toHaveBeenCalledWith("job-1", "provider failed");
    expect(deps.markVideoFailed).toHaveBeenCalledWith(
      "batch-1",
      "Job job-1 failed: provider failed"
    );
    expect(deps.sendJobFailureWebhook).toHaveBeenCalledWith(
      baseJob,
      "provider failed",
      "PROVIDER_ERROR",
      false
    );
  });

  it("does nothing when the runway task is still running", async () => {
    const deps = baseDeps();
    deps.retrieveTask.mockResolvedValue({
      id: "task-1",
      status: "RUNNING",
      createdAt: "2026-03-20T00:00:00.000Z",
      progress: 42
    });

    await reconcileRunwayJobOrchestrator(baseJob, deps);

    expect(deps.handleProviderSuccess).not.toHaveBeenCalled();
    expect(deps.markJobFailed).not.toHaveBeenCalled();
    expect(deps.sendJobFailureWebhook).not.toHaveBeenCalled();
  });
});
