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

  it("returns early for already-completed job (idempotency)", async () => {
    baseDeps.findJobByRequestId.mockResolvedValue({
      id: "job-1",
      videoGenBatchId: "video-1",
      status: "completed"
    });

    await handleFalWebhookOrchestrator(
      { request_id: "req-1", status: "COMPLETED" } as never,
      undefined,
      baseDeps
    );

    expect(baseDeps.handleProviderSuccess).not.toHaveBeenCalled();
    expect(baseDeps.markJobFailed).not.toHaveBeenCalled();
  });

  it("returns early for already-canceled job", async () => {
    baseDeps.findJobByRequestId.mockResolvedValue({
      id: "job-1",
      videoGenBatchId: "video-1",
      status: "canceled"
    });

    await handleFalWebhookOrchestrator(
      { request_id: "req-1", status: "COMPLETED" } as never,
      undefined,
      baseDeps
    );

    expect(baseDeps.handleProviderSuccess).not.toHaveBeenCalled();
  });

  it("looks up by fallbackJobId and attaches requestId when not found by requestId", async () => {
    baseDeps.findJobByRequestId.mockResolvedValue(null);
    baseDeps.findJobById.mockResolvedValue({
      id: "job-1",
      videoGenBatchId: "video-1",
      status: "processing",
      requestId: null
    });
    baseDeps.attachRequestIdToJob.mockResolvedValue(undefined);

    await handleFalWebhookOrchestrator(
      {
        request_id: "req-1",
        status: "COMPLETED",
        payload: { video: { url: "https://video.mp4", metadata: { duration: 4 } } }
      } as never,
      "job-1",
      baseDeps
    );

    expect(baseDeps.attachRequestIdToJob).toHaveBeenCalledWith("job-1", "req-1");
    expect(baseDeps.handleProviderSuccess).toHaveBeenCalled();
  });

  it("returns early when job not found by requestId or fallbackJobId", async () => {
    baseDeps.findJobByRequestId.mockResolvedValue(null);
    baseDeps.findJobById.mockResolvedValue(null);

    await handleFalWebhookOrchestrator(
      { request_id: "req-1", status: "COMPLETED" } as never,
      "job-1",
      baseDeps
    );

    expect(baseDeps.handleProviderSuccess).not.toHaveBeenCalled();
  });
});
