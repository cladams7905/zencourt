import type { DBVideoGenJob } from "@db/types/models";
import { isRunwayGenerationModel } from "@/services/videoGeneration/domain/runwayModels";

type CancelBatchGenerationDeps = {
  findCancelableJobsByBatchId: (batchId: string) => Promise<DBVideoGenJob[]>;
  cancelProviderTask: (taskId: string) => Promise<void>;
  releaseRunwayTask: (taskId: string) => void;
  markBatchCanceled: (batchId: string, reason?: string) => Promise<number>;
};

function isRunwayJob(job: DBVideoGenJob): boolean {
  return isRunwayGenerationModel(job.generationSettings?.model);
}

export async function cancelBatchGenerationOrchestrator(
  batchId: string,
  reason: string,
  deps: CancelBatchGenerationDeps
): Promise<{ canceledBatches: number; canceledJobs: number }> {
  const jobs = await deps.findCancelableJobsByBatchId(batchId);

  for (const job of jobs) {
    if (!job.requestId || !isRunwayJob(job)) {
      continue;
    }

    await deps.cancelProviderTask(job.requestId);
    deps.releaseRunwayTask(job.requestId);
  }

  const canceledBatches = await deps.markBatchCanceled(batchId, reason);

  return {
    canceledBatches,
    canceledJobs: canceledBatches > 0 ? jobs.length : 0
  };
}
