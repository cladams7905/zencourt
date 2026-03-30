import { Router, Request, Response } from "express";
import logger from "@/config/logger";
import { verifyFalWebhookSignature } from "@/services/webhook/security/falWebhookVerification";
import { verifyWaveSpeedWebhookSignature } from "@/services/webhook/security/wavespeedWebhookVerification";
import { videoGenerationService } from "@/services/videoGeneration";
import {
  parseFalWebhookRequest,
  parseWaveSpeedWebhookRequest
} from "@/routes/webhooks/domain/requests";
import {
  enqueueWaveSpeedWebhookProcessing,
  enqueueWebhookProcessing,
  verifyWaveSpeedWebhookRequest,
  verifyWebhookRequest
} from "@/routes/webhooks/orchestrators/handlers";

const router = Router();

function getWaveSpeedWebhookSecret(): string {
  return process.env.WAVESPEED_WEBHOOK_SECRET || "";
}

router.post("/fal", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const context = parseFalWebhookRequest(req);

  try {
    const verification = await verifyWebhookRequest(context, {
      verifyFalWebhookSignature
    });

    if (verification.status !== 200) {
      // Explicit policy: always return 200 to avoid provider retries.
      // Verification failures are handled via logging and dropped processing.
      res.status(200).json({ success: true });
      return;
    }

    logger.info(
      {
        requestId: context.payload.request_id,
        status: context.payload.status,
        jobId: context.jobId,
        webhookDuration: Date.now() - startTime
      },
      "[WebhookRoute] Received fal webhook"
    );

    enqueueWebhookProcessing(context, {
      handleFalWebhook: (payload, jobId) =>
        videoGenerationService.handleFalWebhook(payload, jobId)
    });

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        jobId: context.jobId
      },
      "[WebhookRoute] Failed to parse fal webhook"
    );

    res.status(200).json({ success: true });
  }
});

router.post("/wavespeed", async (req: Request, res: Response) => {
  const context = parseWaveSpeedWebhookRequest(req);

  try {
    const verification = verifyWaveSpeedWebhookRequest(context, {
      verifyWaveSpeedWebhookSignature,
      secret: getWaveSpeedWebhookSecret()
    });

    if (verification.status !== 200) {
      res.status(200).json({ success: true });
      return;
    }

    enqueueWaveSpeedWebhookProcessing(context, {
      handleWaveSpeedWebhook: (payload, jobId) =>
        videoGenerationService.handleWaveSpeedWebhook(payload, jobId)
    });

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        jobId: context.jobId
      },
      "[WebhookRoute] Failed to process wavespeed webhook"
    );

    res.status(200).json({ success: true });
  }
});

export default router;
