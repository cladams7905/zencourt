import crypto from "crypto";

const DEFAULT_MAX_AGE_SECONDS = 300;

export function verifyWaveSpeedWebhookSignature(args: {
  rawBody: Buffer;
  webhookId: string;
  timestamp: string;
  signatureHeader: string;
  secret: string;
  maxAgeSeconds?: number;
}): boolean {
  const {
    rawBody,
    webhookId,
    timestamp,
    signatureHeader,
    secret,
    maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS
  } = args;

  if (!webhookId || !timestamp || !signatureHeader) {
    return false;
  }

  const [version, receivedSignature] = signatureHeader.split(",");
  if (version !== "v3" || !receivedSignature) {
    return false;
  }

  const parsedTimestamp = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(parsedTimestamp)) {
    return false;
  }

  if (Math.abs(Date.now() / 1000 - parsedTimestamp) > maxAgeSeconds) {
    return false;
  }

  const key = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const payload = `${webhookId}.${timestamp}.${rawBody.toString("utf8")}`;
  const expectedSignature = crypto
    .createHmac("sha256", key)
    .update(payload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(receivedSignature)
    );
  } catch {
    return false;
  }
}
