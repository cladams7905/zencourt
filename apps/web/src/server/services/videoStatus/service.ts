import { db, videoGenJobs, videoGenBatch } from "@db/client";
import { asc, desc, eq } from "@db/client";
import type {
  InitialVideoStatusPayload,
  VideoJobUpdateEvent
} from "@web/src/lib/domain/listing/videoStatus";
import { isPriorityCategory } from "@shared/utils";
import { getPublicDownloadUrlSafe } from "../../utils/storageUrls";

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
        metadata: videoGenJobs.metadata,
        errorMessage: videoGenJobs.errorMessage,
        generationSettings: videoGenJobs.generationSettings
      })
      .from(videoGenJobs)
      .where(eq(videoGenJobs.videoGenBatchId, latestVideo.id))
      .orderBy(asc(videoGenJobs.createdAt));

    jobs = jobRows.map((job) => {
      const videoUrl = getPublicDownloadUrlSafe(job.videoUrl) ?? job.videoUrl;
      const thumbnailUrl =
        getPublicDownloadUrlSafe(job.thumbnailUrl) ?? job.thumbnailUrl;
      return {
        listingId,
        jobId: job.id,
        status: job.status,
        videoUrl,
        thumbnailUrl,
          generationModel: job.generationSettings?.model ?? null,
          orientation: job.metadata?.orientation ?? null,
          errorMessage: job.errorMessage,
          roomId: job.generationSettings?.roomId,
          roomName: job.generationSettings?.roomName,
          category: job.generationSettings?.category ?? null,
          isPriorityCategory: job.generationSettings?.category
            ? isPriorityCategory(job.generationSettings.category)
            : false,
          sortOrder: job.generationSettings?.sortOrder ?? null
        };
    });
  }

  return {
    jobs
  };
}
