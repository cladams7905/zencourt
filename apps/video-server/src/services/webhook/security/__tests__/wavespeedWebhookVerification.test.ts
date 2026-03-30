import crypto from "crypto";

import { verifyWaveSpeedWebhookSignature } from "../wavespeedWebhookVerification";

function buildSignature(args: {
  payload: string;
  webhookId: string;
  timestamp: string;
  secret: string;
}) {
  const key = args.secret.startsWith("whsec_")
    ? args.secret.slice(6)
    : args.secret;

  return crypto
    .createHmac("sha256", key)
    .update(`${args.webhookId}.${args.timestamp}.${args.payload}`)
    .digest("hex");
}

describe("verifyWaveSpeedWebhookSignature", () => {
  const payload = JSON.stringify({ id: "task-123", status: "completed" });
  const rawBody = Buffer.from(payload);
  const webhookId = "wh_123";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const secret = "whsec_supersecret";

  it("returns true for a valid signature", () => {
    const signature = buildSignature({
      payload,
      webhookId,
      timestamp,
      secret
    });

    expect(
      verifyWaveSpeedWebhookSignature({
        rawBody,
        webhookId,
        timestamp,
        signatureHeader: `v3,${signature}`,
        secret
      })
    ).toBe(true);
  });

  it("returns false when required headers are missing", () => {
    expect(
      verifyWaveSpeedWebhookSignature({
        rawBody,
        webhookId: "",
        timestamp,
        signatureHeader: "",
        secret
      })
    ).toBe(false);
  });

  it("returns false when the timestamp is too old", () => {
    const oldTimestamp = String(Math.floor(Date.now() / 1000) - 600);
    const signature = buildSignature({
      payload,
      webhookId,
      timestamp: oldTimestamp,
      secret
    });

    expect(
      verifyWaveSpeedWebhookSignature({
        rawBody,
        webhookId,
        timestamp: oldTimestamp,
        signatureHeader: `v3,${signature}`,
        secret
      })
    ).toBe(false);
  });

  it("returns false for an invalid signature format", () => {
    expect(
      verifyWaveSpeedWebhookSignature({
        rawBody,
        webhookId,
        timestamp,
        signatureHeader: "v1,not-valid",
        secret
      })
    ).toBe(false);
  });

  it("strips the whsec_ prefix before computing the hmac", () => {
    const signature = buildSignature({
      payload,
      webhookId,
      timestamp,
      secret
    });

    expect(
      verifyWaveSpeedWebhookSignature({
        rawBody,
        webhookId,
        timestamp,
        signatureHeader: `v3,${signature}`,
        secret
      })
    ).toBe(true);
  });
});
