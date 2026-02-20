import { Router, Request, Response } from "express";
import logger from "@/config/logger";
import { verifyFalWebhookSignature } from "@/lib/utils/falWebhookVerification";
import { videoGenerationService } from "@/services/videoGenerationService";
import { parseFalWebhookRequest } from "@/routes/webhooks/domain/requests";
import {
  enqueueWebhookProcessing,
  verifyWebhookRequest
} from "@/routes/webhooks/orchestrators/handlers";

const router = Router();

router.post("/fal", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const context = parseFalWebhookRequest(req);

  try {
    const verification = await verifyWebhookRequest(context, {
      verifyFalWebhookSignature
    });

    if (verification.status !== 200) {
      res.status(verification.status).json(verification.body);
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

export default router;
