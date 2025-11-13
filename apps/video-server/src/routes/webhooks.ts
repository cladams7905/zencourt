import { Router, Request, Response } from "express";
import logger from "@/config/logger";
import { roomVideoService } from "@/services/roomVideoService";
import type { FalWebhookPayload } from "@/types/requests";

const router = Router();

router.post("/fal", async (req: Request, res: Response) => {
  try {
    const payload = req.body as FalWebhookPayload;

    await roomVideoService.handleFalWebhook(payload);

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      "[WebhookRoute] Failed to process fal webhook"
    );

    res.status(500).json({
      success: false,
      error: "Failed to process fal webhook"
    });
  }
});

export default router;
