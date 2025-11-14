import { Router, Request, Response } from "express";
import logger from "@/config/logger";
import { roomVideoService } from "@/services/roomVideoService";
import type { FalWebhookPayload } from "@shared/types/api";

const router = Router();

/**
 * fal.ai webhook handler
 * Processes video generation completion notifications
 * Returns 200 OK even on internal failures to prevent fal.ai retries
 */
router.post("/fal", async (req: Request, res: Response) => {
  const startTime = Date.now();

  // Extract videoId from query params (fallback for legacy webhooks)
  const rawVideoId = (req.query?.videoId ?? req.query?.video_id) as
    | string
    | string[]
    | undefined;
  const fallbackVideoId = Array.isArray(rawVideoId)
    ? rawVideoId[0]
    : rawVideoId;

  try {
    const payload = req.body as FalWebhookPayload;

    logger.info(
      {
        requestId: payload.request_id,
        status: payload.status,
        fallbackVideoId,
        webhookDuration: Date.now() - startTime
      },
      "[WebhookRoute] Received fal webhook"
    );

    // Process webhook asynchronously (don't wait for completion)
    // This ensures we return 200 OK quickly to fal.ai
    roomVideoService
      .handleFalWebhook(payload, fallbackVideoId)
      .catch((error) => {
        logger.error(
          {
            requestId: payload.request_id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          },
          "[WebhookRoute] Async webhook processing failed"
        );
      });

    // Always return 200 OK to prevent fal.ai retries
    // Internal failures are logged and handled in roomVideoService
    res.status(200).json({ success: true });
  } catch (error) {
    // Log parsing/validation errors but still return 200
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        fallbackVideoId,
        body: req.body
      },
      "[WebhookRoute] Failed to parse fal webhook"
    );

    // Return 200 to prevent retries on malformed payloads
    res.status(200).json({ success: true });
  }
});

export default router;
