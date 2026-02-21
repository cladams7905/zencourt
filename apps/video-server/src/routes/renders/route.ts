import { Router, Request, Response } from "express";
import { validateApiKey } from "@/middleware/auth";
import { asyncHandler } from "@/middleware/errorHandler";
import { renderQueue } from "@/services/render";
import {
  db,
  videoGenJobs as videoJobs,
  videoGenBatch as videos,
  listings,
  eq
} from "@db/client";
import {
  filterAndSortCompletedJobs,
  buildRenderJobData
} from "@/services/render/domain/composition";
import type { PreviewTextOverlay } from "@shared/types/video";
import {
  handleCancelRenderJob,
  handleCreateRender,
  handleGetRenderJob
} from "@/routes/renders/orchestrators/handlers";
import {
  parseCreateRenderRequest,
  parseRenderJobIdParam
} from "@/routes/renders/domain/requests";

const router = Router();

router.use(validateApiKey);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const input = parseCreateRenderRequest(req.body);
    const result = await handleCreateRender(input, {
      fetchVideoContext: async (videoId: string) => {
        const [videoContext] = await db
          .select({
            videoId: videos.id,
            listingId: videos.listingId,
            userId: listings.userId
          })
          .from(videos)
          .innerJoin(listings, eq(videos.listingId, listings.id))
          .where(eq(videos.id, videoId))
          .limit(1);

        if (!videoContext?.listingId || !videoContext?.userId) {
          return null;
        }

        return {
          videoId: videoContext.videoId,
          listingId: videoContext.listingId,
          userId: videoContext.userId
        };
      },
      fetchVideoJobs: async (videoId: string) =>
        db
          .select()
          .from(videoJobs)
          .where(eq(videoJobs.videoGenBatchId, videoId)),
      filterAndSortCompletedJobs,
      buildRenderJobData: (context, completedJobs, textOverlaysByJobId) =>
        buildRenderJobData(
          context,
          completedJobs,
          textOverlaysByJobId as Record<string, PreviewTextOverlay>
        ),
      renderQueue
    });
    res.status(200).json(result);
  })
);

router.get(
  "/:jobId",
  asyncHandler(async (req: Request, res: Response) => {
    const jobId = parseRenderJobIdParam(req);
    const result = handleGetRenderJob(jobId, renderQueue);
    res.status(result.status).json(result.body);
  })
);

router.delete(
  "/:jobId",
  asyncHandler(async (req: Request, res: Response) => {
    const jobId = parseRenderJobIdParam(req);
    const result = handleCancelRenderJob(jobId, renderQueue);
    res.status(result.status).json(result.body);
  })
);

export default router;
