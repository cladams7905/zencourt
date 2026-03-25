import { handleJobExecutionFailureOrchestrator } from "@/services/videoGeneration/orchestrators/handleJobExecutionFailure";

describe("handleJobExecutionFailureOrchestrator", () => {
  const baseJob = {
    id: "job-1",
    videoGenBatchId: "batch-1",
    status: "processing"
  } as never;

  it("marks the job and batch failed and sends a failure webhook", async () => {
    const deps = {
      markJobFailed: jest.fn().mockResolvedValue(undefined),
      markVideoFailed: jest.fn().mockResolvedValue(undefined),
      sendJobFailureWebhook: jest.fn().mockResolvedValue(undefined)
    };

    await handleJobExecutionFailureOrchestrator(
      baseJob,
      "storage upload failed",
      deps
    );

    expect(deps.markJobFailed).toHaveBeenCalledWith(
      "job-1",
      "storage upload failed"
    );
    expect(deps.markVideoFailed).toHaveBeenCalledWith(
      "batch-1",
      "Job job-1 failed: storage upload failed"
    );
    expect(deps.sendJobFailureWebhook).toHaveBeenCalledWith(
      baseJob,
      "storage upload failed",
      "PROCESSING_ERROR",
      false
    );
  });
});
