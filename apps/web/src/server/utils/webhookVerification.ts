import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

export class WebhookVerificationError extends Error {
  constructor(message: string, public status: number = 401) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

function getWebhookSecret(): string {
  const secret = process.env.VERCEL_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new WebhookVerificationError(
      "Webhook secret is not configured",
      500
    );
  }
  return secret;
}

function verifyTimestampAge(timestampHeader: string, toleranceMs: number) {
  const parsed = Date.parse(timestampHeader);
  if (Number.isNaN(parsed)) {
    throw new WebhookVerificationError("Invalid webhook timestamp format", 400);
  }

  const age = Math.abs(Date.now() - parsed);
  if (age > toleranceMs) {
    throw new WebhookVerificationError("Webhook timestamp outside tolerance");
  }
}

function signaturesMatch(provided: string, expected: string) {
  const providedBuf = Buffer.from(provided, "hex");
  const expectedBuf = Buffer.from(expected, "hex");

  if (providedBuf.length !== expectedBuf.length) {
    throw new WebhookVerificationError("Webhook signature mismatch");
  }

  if (!timingSafeEqual(providedBuf, expectedBuf)) {
    throw new WebhookVerificationError("Webhook signature mismatch");
  }
}

export async function parseVerifiedWebhook<T>(
  request: NextRequest,
  options?: {
    toleranceMs?: number;
  }
): Promise<T> {
  const signature = request.headers.get("x-webhook-signature");
  const timestamp = request.headers.get("x-webhook-timestamp");
  const toleranceMs = options?.toleranceMs ?? DEFAULT_TOLERANCE_MS;

  if (!signature) {
    throw new WebhookVerificationError("Missing webhook signature header");
  }
  if (!timestamp) {
    throw new WebhookVerificationError("Missing webhook timestamp header");
  }

  verifyTimestampAge(timestamp, toleranceMs);

  const rawBody = await request.text();
  const secret = getWebhookSecret();
  const expectedSignature = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  signaturesMatch(signature, expectedSignature);

  try {
    return JSON.parse(rawBody) as T;
  } catch (error) {
    throw new WebhookVerificationError(
      error instanceof Error ? error.message : "Invalid JSON payload",
      400
    );
  }
}
