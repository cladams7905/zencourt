import express from "express";
import request from "supertest";
import webhookRoutes from "@/routes/webhooks/route";
import { verifyFalWebhookSignature } from "@/services/webhook/security/falWebhookVerification";
import { verifyWaveSpeedWebhookSignature } from "@/services/webhook/security/wavespeedWebhookVerification";
import { videoGenerationService } from "@/services/videoGeneration";

jest.mock("@/services/webhook/security/falWebhookVerification", () => ({
  verifyFalWebhookSignature: jest.fn()
}));

jest.mock("@/services/webhook/security/wavespeedWebhookVerification", () => ({
  verifyWaveSpeedWebhookSignature: jest.fn()
}));

jest.mock("@/services/videoGeneration", () => ({
  videoGenerationService: {
    handleFalWebhook: jest.fn(),
    handleWaveSpeedWebhook: jest.fn()
  }
}));

const mockedVerifyFalWebhookSignature = verifyFalWebhookSignature as jest.MockedFunction<
  typeof verifyFalWebhookSignature
>;
const mockedVerifyWaveSpeedWebhookSignature =
  verifyWaveSpeedWebhookSignature as jest.MockedFunction<
    typeof verifyWaveSpeedWebhookSignature
  >;
const mockedHandleWaveSpeedWebhook =
  videoGenerationService.handleWaveSpeedWebhook as jest.MockedFunction<
    typeof videoGenerationService.handleWaveSpeedWebhook
  >;

function createApp() {
  const app = express();
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      }
    })
  );
  app.use("/webhooks", webhookRoutes);
  return app;
}

describe("webhooks route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 when signature headers are missing", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/webhooks/fal")
      .send({ request_id: "fal-request-1", status: "COMPLETED" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(mockedVerifyFalWebhookSignature).not.toHaveBeenCalled();
  });

  it("returns 200 when signature verification fails", async () => {
    mockedVerifyFalWebhookSignature.mockResolvedValue(false);
    const app = createApp();

    const response = await request(app)
      .post("/webhooks/fal?requestId=job-1")
      .set("x-fal-webhook-request-id", "fal-request-1")
      .set("x-fal-webhook-user-id", "user-1")
      .set("x-fal-webhook-timestamp", String(Date.now()))
      .set("x-fal-webhook-signature", "deadbeef")
      .send({ request_id: "fal-request-1", status: "COMPLETED" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(mockedVerifyFalWebhookSignature).toHaveBeenCalledTimes(1);
  });

  it("returns 200 when verification throws", async () => {
    mockedVerifyFalWebhookSignature.mockRejectedValue(new Error("verify failed"));
    const app = createApp();

    const response = await request(app)
      .post("/webhooks/fal")
      .set("x-fal-webhook-request-id", "fal-request-1")
      .set("x-fal-webhook-user-id", "user-1")
      .set("x-fal-webhook-timestamp", String(Date.now()))
      .set("x-fal-webhook-signature", "deadbeef")
      .send({ request_id: "fal-request-1", status: "COMPLETED" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });

  it("returns 200 and enqueues processing for valid wavespeed webhooks", async () => {
    mockedVerifyWaveSpeedWebhookSignature.mockReturnValue(true);
    mockedHandleWaveSpeedWebhook.mockResolvedValue(undefined);
    const app = createApp();

    const response = await request(app)
      .post("/webhooks/wavespeed?jobId=job-1")
      .set("webhook-id", "wh_123")
      .set("webhook-timestamp", String(Math.floor(Date.now() / 1000)))
      .set("webhook-signature", "v3,validsignature")
      .send({ id: "task-123", status: "completed", outputs: ["https://cdn/video.mp4"] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(mockedVerifyWaveSpeedWebhookSignature).toHaveBeenCalledTimes(1);
    expect(mockedHandleWaveSpeedWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "task-123",
        status: "completed",
        outputs: ["https://cdn/video.mp4"]
      }),
      "job-1"
    );
  });

  it("returns 200 and skips processing when wavespeed verification fails", async () => {
    mockedVerifyWaveSpeedWebhookSignature.mockReturnValue(false);
    const app = createApp();

    const response = await request(app)
      .post("/webhooks/wavespeed?jobId=job-1")
      .set("webhook-id", "wh_123")
      .set("webhook-timestamp", String(Math.floor(Date.now() / 1000)))
      .set("webhook-signature", "v3,badsignature")
      .send({ id: "task-123", status: "completed", outputs: ["https://cdn/video.mp4"] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(mockedHandleWaveSpeedWebhook).not.toHaveBeenCalled();
  });
});
