import { db, videoGenJobs, videoGenBatch } from "@db/client";
import { asc, desc, eq } from "@db/client";
import type {
  InitialVideoStatusPayload,
  VideoGenerationBatchStatusPayload,
  VideoJobUpdateEvent
} from "@web/src/lib/domain/listing/videoStatus";
import { isPriorityCategory } from "@shared/utils";

function countJobsByStatus(jobs: Array<{ status: string }>) {
  const completedJobs = jobs.filter((job) => job.status === "completed").length;
  const failedJobs = jobs.filter((job) => job.status === "failed").length;
  const canceledJobs = jobs.filter((job) => job.status === "canceled").length;
  const processingJobs = jobs.filter((job) => job.status === "processing").length;
  const pendingJobs = jobs.filter((job) => job.status === "pending").length;
  return {
    totalJobs: jobs.length,
    completedJobs,
    failedJobs,
    canceledJobs,
    processingJobs,
    pendingJobs,
    isTerminal:
      jobs.length > 0 &&
      completedJobs + failedJobs + canceledJobs >= jobs.length,
    allSucceeded: jobs.length > 0 && completedJobs === jobs.length
  };
}

export async function getListingVideoStatus(
  listingId: string,
  resolvePublicDownloadUrlSafe: (
    url: string | null
  ) => string | null | undefined = () => null
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
      const videoUrl =
        resolvePublicDownloadUrlSafe(job.videoUrl) ?? job.videoUrl;
      const thumbnailUrl =
        resolvePublicDownloadUrlSafe(job.thumbnailUrl) ?? job.thumbnailUrl;
      return {
        listingId,
        jobId: job.id,
        status: job.status,
        videoUrl,
        thumbnailUrl,
        generationModel: job.generationSettings?.model ?? null,
        prompt: job.generationSettings?.prompt ?? null,
        imageUrls: job.generationSettings?.imageUrls ?? null,
        orientation: job.metadata?.orientation ?? null,
        errorMessage: job.errorMessage,
        roomId: job.generationSettings?.roomId,
        roomName: job.generationSettings?.roomName,
        category: job.generationSettings?.category ?? null,
        clipIndex: job.generationSettings?.clipIndex ?? null,
        durationSeconds: job.metadata?.duration ?? null,
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

export async function getVideoGenerationStatus(
  batchId: string,
  resolvePublicDownloadUrlSafe: (
    url: string | null
  ) => string | null | undefined = () => null
): Promise<VideoGenerationBatchStatusPayload | null> {
  const batchResult = await db
    .select({
      id: videoGenBatch.id,
      status: videoGenBatch.status,
      errorMessage: videoGenBatch.errorMessage
    })
    .from(videoGenBatch)
    .where(eq(videoGenBatch.id, batchId))
    .limit(1);

  const batch = batchResult[0];
  if (!batch) {
    return null;
  }

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
    .where(eq(videoGenJobs.videoGenBatchId, batch.id))
    .orderBy(asc(videoGenJobs.createdAt));

  for (const job of jobRows) {
    resolvePublicDownloadUrlSafe(job.videoUrl);
    resolvePublicDownloadUrlSafe(job.thumbnailUrl);
  }

  return {
    batchId: batch.id,
    status: batch.status,
    errorMessage: batch.errorMessage,
    ...countJobsByStatus(jobRows)
  };
}
