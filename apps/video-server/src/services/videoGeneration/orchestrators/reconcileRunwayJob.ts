import logger from "@/config/logger";
import type { DBVideoGenJob } from "@db/types/models";
import type { TaskRetrieveResponse } from "@runwayml/sdk/resources/tasks";

type ReconcileRunwayJobDeps = {
  retrieveTask: (taskId: string) => Promise<TaskRetrieveResponse>;
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

function isPendingTask(
  task: TaskRetrieveResponse
): task is
  | TaskRetrieveResponse.Pending
  | TaskRetrieveResponse.Throttled
  | TaskRetrieveResponse.Running {
  return (
    task.status === "PENDING" ||
    task.status === "THROTTLED" ||
    task.status === "RUNNING"
  );
}

function getFailureMessage(task: TaskRetrieveResponse): string | null {
  if (task.status === "FAILED") {
    return task.failure || "Runway task failed";
  }

  if (task.status === "CANCELLED") {
    return "Runway task was canceled";
  }

  return null;
}

export async function reconcileRunwayJobOrchestrator(
  job: DBVideoGenJob,
  deps: ReconcileRunwayJobDeps
): Promise<{ terminal: boolean }> {
  if (!job.requestId) {
    return { terminal: false };
  }

  const task = await deps.retrieveTask(job.requestId);

  if (isPendingTask(task)) {
    logger.debug(
      { jobId: job.id, requestId: job.requestId, taskStatus: task.status },
      "[VideoGenerationService] Runway task still in progress during recovery check"
    );
    return { terminal: false };
  }

  const failureMessage = getFailureMessage(task);
  if (failureMessage) {
    await deps.markJobFailed(job.id, failureMessage);
    await deps.markVideoFailed(job.videoGenBatchId, `Job ${job.id} failed: ${failureMessage}`);
    await deps.sendJobFailureWebhook(job, failureMessage, "PROVIDER_ERROR", false);
    return { terminal: true };
  }

  if (task.status !== "SUCCEEDED") {
    return { terminal: false };
  }

  const outputUrl = task.output[0];
  if (!outputUrl) {
    await deps.markJobFailed(job.id, "Runway task succeeded without an output URL");
    await deps.markVideoFailed(
      job.videoGenBatchId,
      `Job ${job.id} failed: Runway task succeeded without an output URL`
    );
    await deps.sendJobFailureWebhook(
      job,
      "Runway task succeeded without an output URL",
      "PROVIDER_ERROR",
      false
    );
    return { terminal: true };
  }

  await deps.handleProviderSuccess(job, outputUrl, {
    durationSeconds: deps.getJobDurationSeconds(job),
    thumbnailUrl: null
  });

  return { terminal: true };
}
