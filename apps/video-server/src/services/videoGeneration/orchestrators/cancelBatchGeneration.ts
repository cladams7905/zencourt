import type { DBVideoGenJob } from "@db/types/models";
import { isRunwayGenerationModel } from "@/services/videoGeneration/domain/runwayModels";
import type { VideoGenerationProvider } from "@shared/types/models";

type CancelBatchGenerationDeps = {
  findCancelableJobsByBatchId: (batchId: string) => Promise<DBVideoGenJob[]>;
  cancelProviderTask: (taskId: string) => Promise<void>;
  releaseProviderTask: (
    provider: VideoGenerationProvider,
    taskId: string
  ) => void;
  markBatchCanceled: (batchId: string, reason?: string) => Promise<number>;
};

function getJobProvider(job: DBVideoGenJob): VideoGenerationProvider | null {
  const provider = job.generationSettings?.provider;
  if (provider) {
    return provider;
  }

  if (isRunwayGenerationModel(job.generationSettings?.model)) {
    return "runway";
  }

  return null;
}

export async function cancelBatchGenerationOrchestrator(
  batchId: string,
  reason: string,
  deps: CancelBatchGenerationDeps
): Promise<{ canceledBatches: number; canceledJobs: number }> {
  const jobs = await deps.findCancelableJobsByBatchId(batchId);

  for (const job of jobs) {
    const provider = getJobProvider(job);
    if (!job.requestId || !provider) {
      continue;
    }

    if (provider === "runway") {
      await deps.cancelProviderTask(job.requestId);
    }

    deps.releaseProviderTask(provider, job.requestId);
  }

  const canceledBatches = await deps.markBatchCanceled(batchId, reason);

  return {
    canceledBatches,
    canceledJobs: canceledBatches > 0 ? jobs.length : 0
  };
}
