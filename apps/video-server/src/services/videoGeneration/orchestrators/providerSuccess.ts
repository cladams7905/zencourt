import logger from "@/config/logger";
import type { DBVideoGenJob } from "@db/types/models";
import {
  getVideoJobThumbnailPath,
  getVideoJobVideoPath
} from "@shared/utils/storagePaths";
import {
  downloadImageBufferWithRetry,
  downloadVideoBufferWithRetry
} from "@/services/videoGeneration/domain/downloadWithRetry";
import type { VideoJobResult } from "@shared/types/api";

type VideoContext = {
  userId: string;
  listingId: string;
};

type ProviderSuccessDeps = {
  getVideoContext: (videoId: string) => Promise<VideoContext>;
  uploadFile: (options: {
    key: string;
    body: Buffer | string;
    contentType?: string;
    metadata?: Record<string, string>;
  }) => Promise<string>;
  markJobCompleted: (
    jobId: string,
    updates: {
      videoUrl: string;
      thumbnailUrl: string | null;
      metadata: DBVideoGenJob["metadata"];
    }
  ) => Promise<void>;
  sendJobCompletionWebhook: (job: DBVideoGenJob, result: VideoJobResult) => Promise<void>;
  evaluateJobCompletion: (videoId: string) => Promise<{ allCompleted: boolean; failedJobs: number }>;
  markVideoCompleted: (videoId: string, errorMessage: string | null) => Promise<void>;
  getJobDurationSeconds: (job: DBVideoGenJob) => number;
};

export async function handleProviderSuccessOrchestrator(
  job: DBVideoGenJob,
  sourceUrl: string,
  metadata: {
    durationSeconds?: number;
    expectedFileSize?: number;
    thumbnailUrl?: string | null;
  },
  deps: ProviderSuccessDeps
): Promise<void> {
  const videoContext = await deps.getVideoContext(job.videoGenBatchId);
  const videoKey = getVideoJobVideoPath(
    videoContext.userId,
    videoContext.listingId,
    job.videoGenBatchId,
    job.id
  );

  const { buffer: videoBuffer, checksumSha256 } =
    await downloadVideoBufferWithRetry(sourceUrl, {
      expectedSize: metadata.expectedFileSize
    });

  let thumbnailBuffer: Buffer | null = null;
  if (metadata.thumbnailUrl) {
    try {
      thumbnailBuffer = await downloadImageBufferWithRetry(metadata.thumbnailUrl);
    } catch (error) {
      logger.warn(
        { jobId: job.id, error: error instanceof Error ? error.message : String(error) },
        "[VideoGenerationService] Failed to download provider thumbnail"
      );
    }
  }

  if (!thumbnailBuffer) {
    const listingImageUrl = job.generationSettings?.imageUrls?.[0];
    if (listingImageUrl) {
      try {
        thumbnailBuffer = await downloadImageBufferWithRetry(listingImageUrl);
      } catch (error) {
        logger.warn(
          { jobId: job.id, error: error instanceof Error ? error.message : String(error) },
          "[VideoGenerationService] Failed to download listing image for thumbnail"
        );
      }
    }
  }

  const videoUrl = await deps.uploadFile({
    key: videoKey,
    body: videoBuffer,
    contentType: "video/mp4",
    metadata: {
      jobId: job.id,
      videoId: job.videoGenBatchId,
      listingId: videoContext.listingId,
      userId: videoContext.userId,
      generationModel: job.generationSettings?.model || "veo3.1_fast"
    }
  });

  let thumbnailUrl: string | null = null;
  if (thumbnailBuffer) {
    const thumbnailKey = getVideoJobThumbnailPath(
      videoContext.userId,
      videoContext.listingId,
      job.videoGenBatchId,
      job.id
    );
    thumbnailUrl = await deps.uploadFile({
      key: thumbnailKey,
      body: thumbnailBuffer,
      contentType: "image/jpeg",
      metadata: {
        jobId: job.id,
        videoId: job.videoGenBatchId,
        listingId: videoContext.listingId,
        userId: videoContext.userId
      }
    });
  }

  await deps.markJobCompleted(job.id, {
    videoUrl,
    thumbnailUrl,
    metadata: {
      ...job.metadata,
      duration: metadata.durationSeconds,
      fileSize: videoBuffer.length,
      checksumSha256,
      orientation: job.generationSettings?.orientation || "vertical"
    }
  });

  await deps.sendJobCompletionWebhook(job, {
    videoUrl,
    thumbnailUrl: thumbnailUrl ?? undefined,
    duration: metadata.durationSeconds ?? deps.getJobDurationSeconds(job) ?? 0,
    fileSize: videoBuffer.length
  });

  const completionStatus = await deps.evaluateJobCompletion(job.videoGenBatchId);
  if (completionStatus.allCompleted) {
    const failedCount = completionStatus.failedJobs;
    await deps.markVideoCompleted(
      job.videoGenBatchId,
      failedCount > 0 ? `${failedCount} clip${failedCount === 1 ? "" : "s"} failed` : null
    );
  }
}
