import type { FalWebhookRequestContext } from "@/routes/webhooks/domain/requests";
import {
  enqueueWebhookProcessing,
  verifyWebhookRequest
} from "@/routes/webhooks/orchestrators/handlers";

jest.mock("@/config/logger", () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    error: jest.fn()
  }
}));

const BASE_CONTEXT: FalWebhookRequestContext = {
  jobId: "job-1",
  rawBody: Buffer.from("{}"),
  headers: {
    requestId: "req-1",
    userId: "user-1",
    timestamp: "123",
    signature: "sig-1"
  },
  payload: {
    request_id: "req-1",
    status: "completed"
  } as never
};

describe("webhook orchestrators", () => {
  it("returns 400 when required signature fields are missing", async () => {
    const result = await verifyWebhookRequest(
      { ...BASE_CONTEXT, rawBody: undefined },
      {
        verifyFalWebhookSignature: jest.fn()
      }
    );

    expect(result).toEqual({ status: 400, body: { success: false } });
  });

  it("returns 401 for invalid signature", async () => {
    const result = await verifyWebhookRequest(BASE_CONTEXT, {
      verifyFalWebhookSignature: jest.fn().mockResolvedValue(false)
    });

    expect(result).toEqual({ status: 401, body: { success: false } });
  });

  it("returns 200 for valid signature", async () => {
    const result = await verifyWebhookRequest(BASE_CONTEXT, {
      verifyFalWebhookSignature: jest.fn().mockResolvedValue(true)
    });

    expect(result).toEqual({ status: 200, body: { success: true } });
  });

  it("enqueues async webhook processing", async () => {
    const handleFalWebhook = jest.fn().mockResolvedValue(undefined);
    enqueueWebhookProcessing(BASE_CONTEXT, { handleFalWebhook });
    await Promise.resolve();
    expect(handleFalWebhook).toHaveBeenCalledWith(
      BASE_CONTEXT.payload,
      BASE_CONTEXT.jobId
    );
  });
});
