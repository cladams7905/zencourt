import { Router, Request, Response } from "express";
import { validateApiKey } from "@/middleware/auth";
import { asyncHandler } from "@/middleware/errorHandler";
import {
  remotionRenderQueue,
  type RenderJobData
} from "@/services/remotionRenderQueue";
import {
  db,
  videoContentJobs as videoJobs,
  videoContent as videos,
  content,
  listings,
  eq
} from "@db/client";
import {
  filterAndSortCompletedJobs,
  buildRenderJobData
} from "@/utils/compositionHelpers";
import {
  createRenderJobRecord,
  markRenderJobProcessing,
  updateRenderJobProgress,
  markRenderJobCompleted,
  markRenderJobFailed
} from "@/utils/dbHelpers";

const router = Router();

router.use(validateApiKey);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { videoId } = req.body as { videoId?: string };

    if (!videoId) {
      res.status(400).json({ success: false, error: "videoId required" });
      return;
    }

    const [videoContext] = await db
      .select({
        videoId: videos.id,
        listingId: content.listingId,
        userId: listings.userId
      })
      .from(videos)
      .innerJoin(content, eq(videos.contentId, content.id))
      .innerJoin(listings, eq(content.listingId, listings.id))
      .where(eq(videos.id, videoId))
      .limit(1);

    if (!videoContext?.listingId || !videoContext?.userId) {
      res
        .status(404)
        .json({ success: false, error: "Video context not found" });
      return;
    }

    // TypeScript narrowing: after the check above, we know these are non-null
    const context = {
      videoId: videoContext.videoId,
      listingId: videoContext.listingId,
      userId: videoContext.userId
    };

    const jobs = await db
      .select()
      .from(videoJobs)
      .where(eq(videoJobs.videoContentId, videoId));

    const completedJobs = filterAndSortCompletedJobs(jobs);

    if (completedJobs.length === 0) {
      res
        .status(400)
        .json({ success: false, error: "No completed jobs to compose" });
      return;
    }

    const renderJobId = await createRenderJobRecord(videoId);
    const renderData = buildRenderJobData(context, completedJobs);

    const jobId = remotionRenderQueue.createJob(
      renderData,
      {
        onStart: async (_data: RenderJobData) => {
          await markRenderJobProcessing(renderJobId);
        },
        onProgress: async (progress: number, _data: RenderJobData) => {
          await updateRenderJobProgress(renderJobId, progress);
        },
        onComplete: async (
          _result: {
            videoBuffer: Buffer;
            thumbnailBuffer: Buffer;
            durationSeconds: number;
            fileSize: number;
          },
          _data: RenderJobData
        ) => {
          await markRenderJobCompleted(renderJobId);
          return {};
        },
        onError: async (error: Error, _data: RenderJobData) => {
          await markRenderJobFailed(renderJobId, error.message);
        }
      },
      renderJobId
    );

    res.status(200).json({ success: true, jobId, renderJobId });
  })
);

router.get("/:jobId", (req: Request<{ jobId: string }>, res: Response) => {
  const { jobId } = req.params;
  const job = remotionRenderQueue.getJob(jobId);
  if (!job) {
    res.status(404).json({ success: false, error: "Job not found" });
    return;
  }
  res.status(200).json({ success: true, job });
});

router.delete("/:jobId", (req: Request<{ jobId: string }>, res: Response) => {
  const { jobId } = req.params;
  const job = remotionRenderQueue.getJob(jobId);
  if (!job) {
    res.status(404).json({ success: false, error: "Job not found" });
    return;
  }
  if (job.status !== "queued" && job.status !== "in-progress") {
    res.status(400).json({ success: false, error: "Job is not cancellable" });
    return;
  }

  const cancelled = remotionRenderQueue.cancelJob(jobId);
  if (!cancelled) {
    res.status(400).json({ success: false, error: "Cancel failed" });
    return;
  }

  res.status(200).json({ success: true, message: "Job cancelled" });
});

export default router;
