import logger from "@/config/logger";
import type { FalWebhookPayload } from "@shared/types/api";
import type { FalWebhookRequestContext } from "@/routes/webhooks/domain/requests";

type VerifySignatureDeps = {
  verifyFalWebhookSignature: (args: {
    rawBody: Buffer;
    requestId: string;
    userId: string;
    timestamp: string;
    signature: string;
  }) => Promise<boolean>;
};

type HandleWebhookDeps = {
  handleFalWebhook: (
    payload: FalWebhookPayload,
    jobId?: string
  ) => Promise<void>;
};

export async function verifyWebhookRequest(
  context: FalWebhookRequestContext,
  deps: VerifySignatureDeps
): Promise<{ status: 200 | 400 | 401; body: { success: boolean } }> {
  const { rawBody, headers, jobId } = context;
  const { requestId, userId, timestamp, signature } = headers;

  if (!rawBody || !requestId || !userId || !timestamp || !signature) {
    logger.warn(
      {
        hasRawBody: Boolean(rawBody),
        hasRequestId: Boolean(requestId),
        hasUserId: Boolean(userId),
        hasTimestamp: Boolean(timestamp),
        hasSignature: Boolean(signature)
      },
      "[WebhookRoute] Missing Fal webhook signature headers"
    );
    return { status: 400, body: { success: false } };
  }

  const verified = await deps.verifyFalWebhookSignature({
    rawBody,
    requestId,
    userId,
    timestamp,
    signature
  });

  if (!verified) {
    logger.warn(
      { requestId, jobId },
      "[WebhookRoute] Fal webhook signature verification failed"
    );
    return { status: 401, body: { success: false } };
  }

  return { status: 200, body: { success: true } };
}

export function enqueueWebhookProcessing(
  context: FalWebhookRequestContext,
  deps: HandleWebhookDeps
): void {
  const { payload, jobId } = context;
  deps.handleFalWebhook(payload, jobId).catch((error) => {
    logger.error(
      {
        requestId: payload.request_id,
        jobId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      "[WebhookRoute] Async webhook processing failed"
    );
  });
}
