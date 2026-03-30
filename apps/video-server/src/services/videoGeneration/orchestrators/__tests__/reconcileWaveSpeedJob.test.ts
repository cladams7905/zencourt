import { reconcileWaveSpeedJobOrchestrator } from "@/services/videoGeneration/orchestrators/reconcileWaveSpeedJob";

describe("reconcileWaveSpeedJobOrchestrator", () => {
  const baseJob = {
    id: "job-1",
    videoGenBatchId: "batch-1",
    requestId: "task-1",
    metadata: { duration: 4 }
  } as any;

  it("completes stale jobs when wavespeed reports a finished output", async () => {
    const handleProviderSuccess = jest.fn().mockResolvedValue(undefined);

    const result = await reconcileWaveSpeedJobOrchestrator(baseJob, {
      retrieveTask: jest.fn().mockResolvedValue({
        id: "task-1",
        status: "completed",
        outputs: ["https://cdn/video.mp4"],
        error: null
      }),
      handleProviderSuccess,
      markJobFailed: jest.fn(),
      markVideoFailed: jest.fn(),
      sendJobFailureWebhook: jest.fn(),
      getJobDurationSeconds: jest.fn().mockReturnValue(4)
    });

    expect(result).toEqual({ terminal: true });
    expect(handleProviderSuccess).toHaveBeenCalledWith(
      baseJob,
      "https://cdn/video.mp4",
      expect.objectContaining({ durationSeconds: 4, thumbnailUrl: null })
    );
  });

  it("marks stale jobs failed when wavespeed reports an error", async () => {
    const markJobFailed = jest.fn().mockResolvedValue(undefined);
    const markVideoFailed = jest.fn().mockResolvedValue(undefined);
    const sendJobFailureWebhook = jest.fn().mockResolvedValue(undefined);

    const result = await reconcileWaveSpeedJobOrchestrator(baseJob, {
      retrieveTask: jest.fn().mockResolvedValue({
        id: "task-1",
        status: "failed",
        outputs: [],
        error: "provider error"
      }),
      handleProviderSuccess: jest.fn(),
      markJobFailed,
      markVideoFailed,
      sendJobFailureWebhook,
      getJobDurationSeconds: jest.fn().mockReturnValue(4)
    });

    expect(result).toEqual({ terminal: true });
    expect(markJobFailed).toHaveBeenCalledWith("job-1", "provider error");
    expect(markVideoFailed).toHaveBeenCalledWith(
      "batch-1",
      "Job job-1 failed: provider error"
    );
    expect(sendJobFailureWebhook).toHaveBeenCalledWith(
      baseJob,
      "provider error",
      "PROVIDER_ERROR",
      false
    );
  });

  it("keeps stale jobs pending when wavespeed still reports pending", async () => {
    const result = await reconcileWaveSpeedJobOrchestrator(baseJob, {
      retrieveTask: jest.fn().mockResolvedValue({
        id: "task-1",
        status: "pending",
        outputs: [],
        error: null
      }),
      handleProviderSuccess: jest.fn(),
      markJobFailed: jest.fn(),
      markVideoFailed: jest.fn(),
      sendJobFailureWebhook: jest.fn(),
      getJobDurationSeconds: jest.fn().mockReturnValue(4)
    });

    expect(result).toEqual({ terminal: false });
  });
});
