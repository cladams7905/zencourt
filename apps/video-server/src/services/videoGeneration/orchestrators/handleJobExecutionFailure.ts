import type { DBVideoGenJob } from "@db/types/models";

type HandleJobExecutionFailureDeps = {
  markJobFailed: (jobId: string, errorMessage: string) => Promise<void>;
  markVideoFailed: (videoId: string, errorMessage: string) => Promise<void>;
  sendJobFailureWebhook: (
    job: DBVideoGenJob,
    errorMessage: string,
    errorType: string,
    errorRetryable: boolean
  ) => Promise<void>;
};

export async function handleJobExecutionFailureOrchestrator(
  job: DBVideoGenJob,
  errorMessage: string,
  deps: HandleJobExecutionFailureDeps
): Promise<void> {
  await deps.markJobFailed(job.id, errorMessage);
  await deps.markVideoFailed(job.videoGenBatchId, `Job ${job.id} failed: ${errorMessage}`);
  await deps.sendJobFailureWebhook(job, errorMessage, "PROCESSING_ERROR", false);
}
