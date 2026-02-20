import express from "express";
import request from "supertest";
import webhookRoutes from "@/routes/webhooks/route";
import { verifyFalWebhookSignature } from "@/lib/utils/falWebhookVerification";

jest.mock("@/lib/utils/falWebhookVerification", () => ({
  verifyFalWebhookSignature: jest.fn()
}));

const mockedVerifyFalWebhookSignature = verifyFalWebhookSignature as jest.MockedFunction<
  typeof verifyFalWebhookSignature
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
});
