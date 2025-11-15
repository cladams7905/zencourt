import { Router, Request, Response } from "express";
import logger from "@/config/logger";
import { videoGenerationService } from "@/services/videoGenerationService";
import type { FalWebhookPayload } from "@shared/types/api";

const router = Router();

/**
 * fal.ai webhook handler
 * Processes video generation completion notifications for job-based workflow
 * Returns 200 OK even on internal failures to prevent fal.ai retries
 */
router.post("/fal", async (req: Request, res: Response) => {
  const startTime = Date.now();

  // Extract requestId from query params (this is the jobId in new workflow)
  const rawRequestId = (req.query?.requestId ?? req.query?.request_id) as
    | string
    | string[]
    | undefined;
  const jobId = Array.isArray(rawRequestId)
    ? rawRequestId[0]
    : rawRequestId;

  try {
    const payload = req.body as FalWebhookPayload;

    logger.info(
      {
        requestId: payload.request_id,
        status: payload.status,
        jobId,
        webhookDuration: Date.now() - startTime
      },
      "[WebhookRoute] Received fal webhook"
    );

    // Process webhook asynchronously (don't wait for completion)
    // This ensures we return 200 OK quickly to fal.ai
    videoGenerationService
      .handleFalWebhook(payload, jobId)
      .catch((error) => {
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

    // Always return 200 OK to prevent fal.ai retries
    // Internal failures are logged and handled in videoGenerationService
    res.status(200).json({ success: true });
  } catch (error) {
    // Log parsing/validation errors but still return 200
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        jobId,
        body: req.body
      },
      "[WebhookRoute] Failed to parse fal webhook"
    );

    // Return 200 to prevent retries on malformed payloads
    res.status(200).json({ success: true });
  }
});

export default router;
