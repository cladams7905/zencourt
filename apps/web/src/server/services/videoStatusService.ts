import { db, videoGenJobs, videoGenBatch } from "@db/client";
import { asc, desc, eq } from "drizzle-orm";
import type {
  InitialVideoStatusPayload,
  VideoJobUpdateEvent
} from "@web/src/types/video-status";
import { isPriorityCategory } from "@shared/types/video";
import { getSignedDownloadUrlSafe } from "../utils/storageUrls";

const VIDEO_STATUS_URL_TTL_SECONDS = 6 * 60 * 60; // 6 hours

export async function getListingVideoStatus(
  listingId: string
): Promise<InitialVideoStatusPayload> {
  const latestVideoResult = await db
    .select({
      id: videoGenBatch.id,
      status: videoGenBatch.status,
      errorMessage: videoGenBatch.errorMessage
    })
    .from(videoGenBatch)
    .where(eq(videoGenBatch.listingId, listingId))
    .orderBy(desc(videoGenBatch.createdAt))
    .limit(1);

  const latestVideo = latestVideoResult[0];

  let jobs: VideoJobUpdateEvent[] = [];

  if (latestVideo) {
    const jobRows = await db
      .select({
        id: videoGenJobs.id,
        status: videoGenJobs.status,
        videoUrl: videoGenJobs.videoUrl,
        thumbnailUrl: videoGenJobs.thumbnailUrl,
        generationModel: videoGenJobs.generationModel,
        metadata: videoGenJobs.metadata,
        errorMessage: videoGenJobs.errorMessage,
        generationSettings: videoGenJobs.generationSettings
      })
      .from(videoGenJobs)
      .where(eq(videoGenJobs.videoGenBatchId, latestVideo.id))
      .orderBy(asc(videoGenJobs.createdAt));

    jobs = await Promise.all(
      jobRows.map(async (job) => {
        const [signedVideoUrl, signedThumbnailUrl] = await Promise.all([
          getSignedDownloadUrlSafe(
            job.videoUrl,
            VIDEO_STATUS_URL_TTL_SECONDS
          ),
          getSignedDownloadUrlSafe(
            job.thumbnailUrl,
            VIDEO_STATUS_URL_TTL_SECONDS
          )
        ]);
        return {
          listingId,
          jobId: job.id,
          status: job.status,
          videoUrl: signedVideoUrl ?? job.videoUrl,
          thumbnailUrl: signedThumbnailUrl ?? job.thumbnailUrl,
          generationModel: job.generationModel,
          orientation: job.metadata?.orientation ?? null,
          errorMessage: job.errorMessage,
          roomId: job.generationSettings?.roomId,
          roomName: job.generationSettings?.roomName,
          category: job.generationSettings?.category ?? null,
          durationSeconds: job.generationSettings?.durationSeconds ?? null,
          isPriorityCategory: job.generationSettings?.category
            ? isPriorityCategory(job.generationSettings.category)
            : false,
          sortOrder: job.generationSettings?.sortOrder ?? null
        };
      })
    );
  }

  return {
    jobs
  };
}
