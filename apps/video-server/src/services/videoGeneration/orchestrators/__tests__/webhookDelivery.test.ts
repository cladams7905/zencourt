import {
  sendJobCompletionWebhookOrchestrator,
  sendJobFailureWebhookOrchestrator
} from "@/services/videoGeneration/orchestrators/webhookDelivery";

describe("webhookDelivery orchestrators", () => {
  beforeEach(() => {
    process.env.VERCEL_API_URL = "https://api.example.com";
    process.env.VERCEL_WEBHOOK_SECRET = "secret";
  });

  it("sends completion webhook", async () => {
    const sendWebhook = jest.fn().mockResolvedValue(undefined);
    await sendJobCompletionWebhookOrchestrator(
      { id: "job-1", videoGenBatchId: "video-1" } as never,
      { videoUrl: "https://cdn/video.mp4", duration: 4, fileSize: 1 },
      {
        getVideoContext: jest.fn().mockResolvedValue({ listingId: "listing-1" }),
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
        getVideoContext: jest.fn().mockResolvedValue({ listingId: "listing-1" }),
        sendWebhook
      }
    );

    expect(sendWebhook).toHaveBeenCalledTimes(1);
  });
});
