/**
 * Video processing routes
 * Handles video generation requests and status queries
 */

import { Router, Request, Response } from "express";
import { validateApiKey } from "@/middleware/auth";
import { asyncHandler } from "@/middleware/errorHandler";
import { videoGenerationService } from "@/services/videoGenerationService";
import {
  cancelVideosByListing,
  cancelVideosByIds,
  cancelJobsByListingId
} from "@/lib/utils/dbHelpers";
import {
  parseCancelVideoRequest,
  parseGenerateVideoRequest
} from "@/routes/video/domain/requests";
import {
  handleCancelVideo,
  handleGenerateVideo
} from "@/routes/video/orchestrators/handlers";

const router = Router();

// Apply authentication middleware to all video routes
router.use(validateApiKey);

/**
 * POST /video/generate
 * Process video generation jobs using the new job-based workflow
 * Accepts parent videoId and jobIds, reads video_asset_jobs from DB, dispatches to Fal
 */
router.post(
  "/generate",
  asyncHandler(async (req: Request, res: Response) => {
    const requestData = parseGenerateVideoRequest(req.body);
    const result = await handleGenerateVideo(requestData, {
      generationService: videoGenerationService
    });
    res.status(202).json(result.body);
  })
);

/**
 * POST /video/cancel
 * Mark in-flight room videos and jobs as canceled
 */
router.post(
  "/cancel",
  asyncHandler(async (req: Request, res: Response) => {
    const requestData = parseCancelVideoRequest(req.body);
    const result = await handleCancelVideo(requestData, {
      cancelVideosByListing,
      cancelVideosByIds,
      cancelJobsByListingId
    });
    res.status(200).json(result.body);
  })
);

export default router;
