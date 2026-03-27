import { db, videoGenJobs, videoGenBatch } from "@db/client";
import { asc, desc, eq } from "@db/client";
import {
  updateVideoGenBatch,
  updateVideoGenJob
} from "@web/src/server/models/video";
import type { VideoStatus } from "@db/types/models";
import type {
  InitialVideoStatusPayload,
  VideoGenerationBatchStatusPayload,
  VideoJobUpdateEvent
} from "@web/src/lib/domain/listings/video/videoStatus";
import { isPriorityCategory } from "@shared/utils";
import {
  getBatchGenerationHardTimeoutMs,
  isPastTimeout,
  VIDEO_GENERATION_TIMEOUT_MESSAGE
} from "@web/src/lib/domain/listings/video/videoGenerationTimeouts";

function countJobsByStatus(jobs: Array<{ status: string }>) {
  const completedJobs = jobs.filter((job) => job.status === "completed").length;
  const failedJobs = jobs.filter((job) => job.status === "failed").length;
  const canceledJobs = jobs.filter((job) => job.status === "canceled").length;
  const processingJobs = jobs.filter(
    (job) => job.status === "processing"
  ).length;
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

function isNonTerminalStatus(status: string): boolean {
  return ["pending", "processing"].includes(status);
}

async function failTimedOutBatch<
  T extends {
    id: string;
    status: VideoStatus;
    errorMessage?: string | null;
  }
>(args: {
  batchId: string;
  createdAt: Date;
  status: VideoStatus;
  errorMessage: string | null;
  jobs: T[];
}): Promise<{
  batchStatus: VideoStatus;
  batchErrorMessage: string | null;
  jobs: T[];
}> {
  const { batchId, createdAt, status, errorMessage, jobs } = args;
  if (
    !isNonTerminalStatus(status) ||
    !isPastTimeout(createdAt, getBatchGenerationHardTimeoutMs(jobs.length))
  ) {
    return {
      batchStatus: status,
      batchErrorMessage: errorMessage,
      jobs
    };
  }

  const timedOutJobs = jobs.filter((job) => isNonTerminalStatus(job.status));

  await Promise.all(
    timedOutJobs.map((job) =>
      updateVideoGenJob(job.id, {
        status: "failed",
        errorMessage: VIDEO_GENERATION_TIMEOUT_MESSAGE
      })
    )
  );
  await updateVideoGenBatch(batchId, {
    status: "failed",
    errorMessage: VIDEO_GENERATION_TIMEOUT_MESSAGE
  });

  return {
    batchStatus: "failed",
    batchErrorMessage: VIDEO_GENERATION_TIMEOUT_MESSAGE,
    jobs: jobs.map((job) =>
      isNonTerminalStatus(job.status)
        ? {
            ...job,
            status: "failed",
            errorMessage: VIDEO_GENERATION_TIMEOUT_MESSAGE
          }
        : job
    )
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
      errorMessage: videoGenBatch.errorMessage,
      createdAt: videoGenBatch.createdAt
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

    const resolvedBatch = await failTimedOutBatch({
      batchId: latestVideo.id,
      createdAt: latestVideo.createdAt,
      status: latestVideo.status,
      errorMessage: latestVideo.errorMessage,
      jobs: jobRows
    });

    jobs = resolvedBatch.jobs.map((job) => {
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
      errorMessage: videoGenBatch.errorMessage,
      createdAt: videoGenBatch.createdAt
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

  const resolvedBatch = await failTimedOutBatch({
    batchId: batch.id,
    createdAt: batch.createdAt,
    status: batch.status,
    errorMessage: batch.errorMessage,
    jobs: jobRows
  });

  return {
    batchId: batch.id,
    status: resolvedBatch.batchStatus,
    createdAt: batch.createdAt.toISOString(),
    errorMessage: resolvedBatch.batchErrorMessage,
    ...countJobsByStatus(resolvedBatch.jobs)
  };
}
