import { createReadStream } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { Router, Request, Response } from "express";
import logger from "@/config/logger";
import { validateApiKey } from "@/middleware/auth";
import {
  asyncHandler,
  VideoProcessingError,
  VideoProcessingErrorType
} from "@/middleware/errorHandler";
import { renderQueue } from "@/services/render";
import {
  db,
  videoClipVersions,
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
import { parseCreateReelExportRequest } from "@/routes/renders/domain/reelExportRequests";
import { prepareReelExportClips } from "@/services/render/domain/premiumReelExport";
import { upscaleVideoTo4k } from "@/services/render/providers/wavespeed/upscaler";

const router = Router();
const REEL_EXPORT_ARTIFACT_DIR = path.join(tmpdir(), "zencourt-reel-exports");
const STANDARD_REEL_EXPORT_TIMEOUT_MS = 5 * 60 * 1000;
const PREMIUM_REEL_EXPORT_TIMEOUT_MS = 10 * 60 * 1000;
const PREMIUM_UPSCALING_PROGRESS_SHARE = 0.5;

router.use(validateApiKey);

async function persistReelExportArtifact(
  exportId: string,
  videoBuffer: Buffer
): Promise<string> {
  await mkdir(REEL_EXPORT_ARTIFACT_DIR, { recursive: true });
  const artifactPath = path.join(
    REEL_EXPORT_ARTIFACT_DIR,
    `${exportId}-${Date.now()}.mp4`
  );
  await writeFile(artifactPath, videoBuffer);
  return artifactPath;
}

router.post(
  "/reel-export",
  asyncHandler(async (req: Request, res: Response) => {
    const input = parseCreateReelExportRequest(req.body);
    const exportJobId = input.exportId;
    const isPremiumExport = input.quality === "premium";
    const premiumListingClipCount = input.clips.filter(
      (clip) => clip.sourceType === "listing_clip"
    ).length;
    let lastLoggedBucket = -1;
    logger.info(
      {
        exportId: input.exportId,
        quality: input.quality,
        clipCount: input.clips.length,
        listingClipCount: input.clips.filter((clip) => clip.sourceType === "listing_clip").length,
        userMediaClipCount: input.clips.filter((clip) => clip.sourceType === "user_media").length
      },
      "[RenderProvider] Reel export accepted"
    );
    const jobId = renderQueue.createJob(
      {
        videoId: input.exportId,
        listingId: "reel-export",
        userId: "reel-export",
        clips: input.clips.map((clip) => ({
          src: clip.originalVideoUrl,
          durationSeconds: clip.durationSeconds,
          ...(clip.textOverlay ? { textOverlay: clip.textOverlay } : {}),
          supplementalAddressOverlay: clip.supplementalAddressOverlay ?? null
        })),
        orientation: input.orientation
      },
      {
        onStart: async (data) => {
          if (!isPremiumExport) {
            return;
          }

          renderQueue.updateJobPhase(exportJobId, "upscaling", 0);
          logger.info(
            {
              exportId: input.exportId,
              jobId: exportJobId
            },
            "[RenderProvider] Premium reel export entering upscaling phase"
          );
          const preparedClips = await prepareReelExportClips(input, {
            upscaleListingClip: async ({ sourceUrl }) =>
              upscaleVideoTo4k({ sourceUrl }),
            persistUpscaleUrl: async (clipVersionId, upscaleUrl) => {
              await db
                .update(videoClipVersions)
                .set({
                  upscaleUrl,
                  updatedAt: new Date()
                })
                .where(eq(videoClipVersions.id, clipVersionId));
              logger.info(
                {
                  exportId: input.exportId,
                  clipVersionId
                },
                "[RenderProvider] Persisted premium upscale url"
              );
            },
            onListingClipPrepared:
              premiumListingClipCount > 0
                ? ({ completedCount, totalCount }) => {
                    renderQueue.updateJobPhase(
                      exportJobId,
                      "upscaling",
                      (completedCount / totalCount) *
                        PREMIUM_UPSCALING_PROGRESS_SHARE
                    );
                  }
                : undefined
          });
          data.clips.splice(0, data.clips.length, ...preparedClips);
          renderQueue.updateJobPhase(
            exportJobId,
            "rendering",
            isPremiumExport ? PREMIUM_UPSCALING_PROGRESS_SHARE : 0
          );
          logger.info(
            {
              exportId: input.exportId,
              jobId: exportJobId,
              preparedClipCount: preparedClips.length
            },
            "[RenderProvider] Premium reel export entering rendering phase"
          );
        },
        onProgress: async (progress) => {
          const bucket = Math.floor(progress * 10);
          if (bucket <= lastLoggedBucket) {
            return;
          }

          lastLoggedBucket = bucket;
          logger.info(
            {
              exportId: input.exportId,
              progress: Number((progress * 100).toFixed(1))
            },
            "[RenderProvider] Reel export progress"
          );
        },
        mapProgress: isPremiumExport
          ? (progress) =>
              PREMIUM_UPSCALING_PROGRESS_SHARE +
              progress * (1 - PREMIUM_UPSCALING_PROGRESS_SHARE)
          : undefined,
        onComplete: async (result) => ({
          artifactPath: await persistReelExportArtifact(
            input.exportId,
            result.videoBuffer
          )
        }),
        onError: async (error) => {
          logger.error(
            {
              exportId: input.exportId,
              jobId: exportJobId,
              error: error.message
            },
            "[RenderProvider] Reel export failed"
          );
        },
        timeoutMs: isPremiumExport
          ? PREMIUM_REEL_EXPORT_TIMEOUT_MS
          : STANDARD_REEL_EXPORT_TIMEOUT_MS
      },
      exportJobId
    );

    res.status(200).json({ success: true, jobId });
  })
);

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

router.get(
  "/:jobId/artifact",
  asyncHandler(async (req: Request, res: Response) => {
    const jobId = parseRenderJobIdParam(req);
    const job = renderQueue.getJob(jobId);

    if (!job) {
      throw new VideoProcessingError(
        "Render job not found",
        VideoProcessingErrorType.JOB_NOT_FOUND,
        { statusCode: 404 }
      );
    }

    if (
      job.status !== "completed" ||
      !job.artifactReady ||
      !job.artifactPath
    ) {
      throw new VideoProcessingError(
        "Render artifact not ready",
        VideoProcessingErrorType.INVALID_INPUT,
        { statusCode: 409 }
      );
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Cache-Control", "no-store");
    const artifactPath = job.artifactPath;
    const stream = createReadStream(artifactPath);
    const cleanup = () => {
      void renderQueue.clearArtifact(jobId);
    };

    res.once("finish", cleanup);
    res.once("close", cleanup);
    stream.pipe(res);
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
