import { createHmac } from "crypto";
import { parseVerifiedWebhook } from "@web/src/server/utils/webhookVerification";

type MockRequest = {
  headers: {
    get: (name: string) => string | null;
  };
  text: () => Promise<string>;
};

function createRequest(params: {
  body: string;
  signature?: string | null;
  timestamp?: string | null;
}): MockRequest {
  const headers = new Map<string, string>();
  if (params.signature !== undefined && params.signature !== null) {
    headers.set("x-webhook-signature", params.signature);
  }
  if (params.timestamp !== undefined && params.timestamp !== null) {
    headers.set("x-webhook-timestamp", params.timestamp);
  }

  return {
    headers: {
      get: (name: string) => headers.get(name.toLowerCase()) ?? null
    },
    text: async () => params.body
  };
}

describe("webhookVerification", () => {
  const originalSecret = process.env.VERCEL_WEBHOOK_SECRET;

  afterEach(() => {
    process.env.VERCEL_WEBHOOK_SECRET = originalSecret;
    jest.restoreAllMocks();
  });

  it("verifies signature and parses webhook payload", async () => {
    process.env.VERCEL_WEBHOOK_SECRET = "super-secret";
    const body = JSON.stringify({ event: "video.completed", id: "evt-1" });
    const signature = createHmac("sha256", "super-secret")
      .update(body)
      .digest("hex");

    const request = createRequest({
      body,
      signature,
      timestamp: new Date().toISOString()
    });

    await expect(parseVerifiedWebhook<{ event: string }>(request as never)).resolves.toEqual({
      event: "video.completed",
      id: "evt-1"
    });
  });

  it("throws when required headers are missing", async () => {
    process.env.VERCEL_WEBHOOK_SECRET = "super-secret";

    const withoutSignature = createRequest({
      body: "{}",
      timestamp: new Date().toISOString()
    });
    await expect(parseVerifiedWebhook(withoutSignature as never)).rejects.toMatchObject({
      message: "Missing webhook signature header",
      status: 401
    });

    const withoutTimestamp = createRequest({
      body: "{}",
      signature: "abc"
    });
    await expect(parseVerifiedWebhook(withoutTimestamp as never)).rejects.toMatchObject({
      message: "Missing webhook timestamp header",
      status: 401
    });
  });

  it("rejects invalid or stale timestamps", async () => {
    process.env.VERCEL_WEBHOOK_SECRET = "super-secret";
    const body = "{}";
    const signature = createHmac("sha256", "super-secret")
      .update(body)
      .digest("hex");

    const invalidTimestamp = createRequest({
      body,
      signature,
      timestamp: "not-a-date"
    });
    await expect(parseVerifiedWebhook(invalidTimestamp as never)).rejects.toMatchObject({
      message: "Invalid webhook timestamp format",
      status: 400
    });

    const staleTimestamp = createRequest({
      body,
      signature,
      timestamp: new Date(Date.now() - 60_000).toISOString()
    });
    await expect(
      parseVerifiedWebhook(staleTimestamp as never, { toleranceMs: 1000 })
    ).rejects.toThrow("Webhook timestamp outside tolerance");
  });

  it("rejects when secret is missing or signature mismatches", async () => {
    const body = JSON.stringify({ ok: true });
    const signature = "deadbeef";

    process.env.VERCEL_WEBHOOK_SECRET = "";
    const missingSecretRequest = createRequest({
      body,
      signature,
      timestamp: new Date().toISOString()
    });
    await expect(
      parseVerifiedWebhook(missingSecretRequest as never)
    ).rejects.toMatchObject({
      message: "Webhook secret is not configured",
      status: 500
    });

    process.env.VERCEL_WEBHOOK_SECRET = "super-secret";
    const mismatchRequest = createRequest({
      body,
      signature,
      timestamp: new Date().toISOString()
    });
    await expect(parseVerifiedWebhook(mismatchRequest as never)).rejects.toThrow(
      "Webhook signature mismatch"
    );
  });

  it("rejects invalid JSON payload after successful verification", async () => {
    process.env.VERCEL_WEBHOOK_SECRET = "super-secret";
    const body = "{invalid-json";
    const signature = createHmac("sha256", "super-secret")
      .update(body)
      .digest("hex");

    const request = createRequest({
      body,
      signature,
      timestamp: new Date().toISOString()
    });

    await expect(parseVerifiedWebhook(request as never)).rejects.toMatchObject({
      status: 400
    });
  });
});
