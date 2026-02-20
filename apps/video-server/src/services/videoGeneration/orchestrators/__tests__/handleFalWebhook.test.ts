import { handleFalWebhookOrchestrator } from "@/services/videoGeneration/orchestrators/handleFalWebhook";

describe("handleFalWebhookOrchestrator", () => {
  const baseDeps = {
    findJobByRequestId: jest.fn(),
    findJobById: jest.fn(),
    attachRequestIdToJob: jest.fn(),
    markJobFailed: jest.fn(),
    markVideoFailed: jest.fn(),
    handleProviderSuccess: jest.fn(),
    sendJobFailureWebhook: jest.fn(),
    getJobDurationSeconds: jest.fn().mockReturnValue(4)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns for missing request id", async () => {
    await handleFalWebhookOrchestrator(
      { status: "COMPLETED" } as never,
      undefined,
      baseDeps
    );
    expect(baseDeps.findJobByRequestId).not.toHaveBeenCalled();
  });

  it("fails job and sends failure webhook on fal error", async () => {
    baseDeps.findJobByRequestId.mockResolvedValue({
      id: "job-1",
      videoGenBatchId: "video-1",
      status: "processing"
    });

    await handleFalWebhookOrchestrator(
      {
        request_id: "req-1",
        status: "ERROR",
        error: "provider failed"
      } as never,
      undefined,
      baseDeps
    );

    expect(baseDeps.markJobFailed).toHaveBeenCalledWith("job-1", "provider failed");
    expect(baseDeps.markVideoFailed).toHaveBeenCalledWith(
      "video-1",
      "Job job-1 failed: provider failed"
    );
    expect(baseDeps.sendJobFailureWebhook).toHaveBeenCalled();
  });

  it("routes successful payload to provider success handler", async () => {
    baseDeps.findJobByRequestId.mockResolvedValue({
      id: "job-1",
      videoGenBatchId: "video-1",
      status: "processing"
    });

    await handleFalWebhookOrchestrator(
      {
        request_id: "req-1",
        status: "COMPLETED",
        payload: { video: { url: "https://video/url.mp4", metadata: { duration: 5 } } }
      } as never,
      undefined,
      baseDeps
    );

    expect(baseDeps.handleProviderSuccess).toHaveBeenCalled();
    expect(baseDeps.markJobFailed).not.toHaveBeenCalled();
  });
});
