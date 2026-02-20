import {
  sendJobCompletionWebhookOrchestrator,
  sendJobFailureWebhookOrchestrator
} from "@/services/videoGeneration/orchestrators/webhookDelivery";

describe("webhookDelivery orchestrators", () => {
  beforeEach(() => {
    process.env.VERCEL_WEBHOOK_SECRET = "secret";
  });

  it("sends completion webhook", async () => {
    const sendWebhook = jest.fn().mockResolvedValue(undefined);
    await sendJobCompletionWebhookOrchestrator(
      { id: "job-1", videoGenBatchId: "video-1" } as never,
      { videoUrl: "https://cdn/video.mp4", duration: 4, fileSize: 1 },
      {
        getVideoContext: jest.fn().mockResolvedValue({
          listingId: "listing-1",
          callbackUrl: "https://preview.example.com/api/v1/webhooks/video"
        }),
        sendWebhook
      }
    );

    expect(sendWebhook).toHaveBeenCalledTimes(1);
  });

  it("sends failure webhook", async () => {
    const sendWebhook = jest.fn().mockResolvedValue(undefined);
    await sendJobFailureWebhookOrchestrator(
      { id: "job-1", videoGenBatchId: "video-1" } as never,
      "failed",
      "PROVIDER_ERROR",
      false,
      {
        getVideoContext: jest.fn().mockResolvedValue({
          listingId: "listing-1",
          callbackUrl: "https://preview.example.com/api/v1/webhooks/video"
        }),
        sendWebhook
      }
    );

    expect(sendWebhook).toHaveBeenCalledTimes(1);
  });

  it("skips completion webhook when VERCEL_WEBHOOK_SECRET is missing", async () => {
    delete process.env.VERCEL_WEBHOOK_SECRET;
    const sendWebhook = jest.fn();

    await sendJobCompletionWebhookOrchestrator(
      { id: "job-1", videoGenBatchId: "video-1" } as never,
      { videoUrl: "https://cdn/video.mp4", duration: 4, fileSize: 1 },
      {
        getVideoContext: jest.fn().mockResolvedValue({
          listingId: "listing-1",
          callbackUrl: "https://preview.example.com/api/v1/webhooks/video"
        }),
        sendWebhook
      }
    );

    expect(sendWebhook).not.toHaveBeenCalled();
  });

  it("logs error but does not rethrow when completion webhook delivery fails", async () => {
    const sendWebhook = jest.fn().mockRejectedValue(new Error("network error"));

    await expect(
      sendJobCompletionWebhookOrchestrator(
        { id: "job-1", videoGenBatchId: "video-1" } as never,
        { videoUrl: "https://cdn/video.mp4", duration: 4, fileSize: 1 },
        {
          getVideoContext: jest.fn().mockResolvedValue({
            listingId: "listing-1",
            callbackUrl: "https://preview.example.com/api/v1/webhooks/video"
          }),
          sendWebhook
        }
      )
    ).resolves.toBeUndefined();
  });

  it("logs error but does not rethrow when failure webhook delivery fails", async () => {
    const sendWebhook = jest.fn().mockRejectedValue(new Error("network error"));

    await expect(
      sendJobFailureWebhookOrchestrator(
        { id: "job-1", videoGenBatchId: "video-1" } as never,
        "error",
        "PROVIDER_ERROR",
        false,
        {
          getVideoContext: jest.fn().mockResolvedValue({
            listingId: "listing-1",
            callbackUrl: "https://preview.example.com/api/v1/webhooks/video"
          }),
          sendWebhook
        }
      )
    ).resolves.toBeUndefined();
  });

  it("skips failure webhook when callbackUrl is empty", async () => {
    const sendWebhook = jest.fn();

    await sendJobFailureWebhookOrchestrator(
      { id: "job-1", videoGenBatchId: "video-1" } as never,
      "failed",
      "PROVIDER_ERROR",
      false,
      {
        getVideoContext: jest.fn().mockResolvedValue({
          listingId: "listing-1",
          callbackUrl: ""
        }),
        sendWebhook
      }
    );

    expect(sendWebhook).not.toHaveBeenCalled();
  });

  it("skips failure webhook when VERCEL_WEBHOOK_SECRET is missing", async () => {
    delete process.env.VERCEL_WEBHOOK_SECRET;
    const sendWebhook = jest.fn();

    await sendJobFailureWebhookOrchestrator(
      { id: "job-1", videoGenBatchId: "video-1" } as never,
      "failed",
      "PROVIDER_ERROR",
      false,
      {
        getVideoContext: jest.fn().mockResolvedValue({
          listingId: "listing-1",
          callbackUrl: "https://preview.example.com/api/v1/webhooks/video"
        }),
        sendWebhook
      }
    );

    expect(sendWebhook).not.toHaveBeenCalled();
  });
});
