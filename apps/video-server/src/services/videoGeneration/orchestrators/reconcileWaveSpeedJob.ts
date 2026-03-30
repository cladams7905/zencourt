import logger from "@/config/logger";
import type { DBVideoGenJob } from "@db/types/models";
import type { WaveSpeedTaskResult } from "@/services/providers/wavespeed";

type ReconcileWaveSpeedJobDeps = {
  retrieveTask: (taskId: string) => Promise<WaveSpeedTaskResult>;
  handleProviderSuccess: (
    job: DBVideoGenJob,
    sourceUrl: string,
    metadata: {
      durationSeconds?: number;
      expectedFileSize?: number;
      thumbnailUrl?: string | null;
    }
  ) => Promise<void>;
  markJobFailed: (jobId: string, errorMessage: string) => Promise<void>;
  markVideoFailed: (videoId: string, errorMessage: string) => Promise<void>;
  sendJobFailureWebhook: (
    job: DBVideoGenJob,
    errorMessage: string,
    errorType: string,
    errorRetryable: boolean
  ) => Promise<void>;
  getJobDurationSeconds: (job: DBVideoGenJob) => number;
};

export async function reconcileWaveSpeedJobOrchestrator(
  job: DBVideoGenJob,
  deps: ReconcileWaveSpeedJobDeps
): Promise<{ terminal: boolean }> {
  if (!job.requestId) {
    return { terminal: false };
  }

  const task = await deps.retrieveTask(job.requestId);

  if (task.status === "pending") {
    logger.debug(
      { jobId: job.id, requestId: job.requestId, taskStatus: task.status },
      "[VideoGenerationService] WaveSpeed task still in progress during recovery check"
    );
    return { terminal: false };
  }

  if (task.status === "failed") {
    const failureMessage = task.error || "WaveSpeed task failed";
    await deps.markJobFailed(job.id, failureMessage);
    await deps.markVideoFailed(job.videoGenBatchId, `Job ${job.id} failed: ${failureMessage}`);
    await deps.sendJobFailureWebhook(job, failureMessage, "PROVIDER_ERROR", false);
    return { terminal: true };
  }

  const outputUrl = task.outputs?.[0];
  if (!outputUrl) {
    const failureMessage = "WaveSpeed task succeeded without an output URL";
    await deps.markJobFailed(job.id, failureMessage);
    await deps.markVideoFailed(job.videoGenBatchId, `Job ${job.id} failed: ${failureMessage}`);
    await deps.sendJobFailureWebhook(job, failureMessage, "PROVIDER_ERROR", false);
    return { terminal: true };
  }

  await deps.handleProviderSuccess(job, outputUrl, {
    durationSeconds: deps.getJobDurationSeconds(job),
    thumbnailUrl: null
  });

  return { terminal: true };
}
