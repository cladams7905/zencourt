import logger from "@/config/logger";
import type { DBVideoGenJob } from "@shared/types/models";
import { filterAndSortCompletedJobs } from "@/lib/utils/compositionHelpers";

type EvaluateCompletionDeps = {
  findJobsByVideoId: (videoId: string) => Promise<DBVideoGenJob[]>;
  markVideoFailed: (videoId: string, errorMessage: string) => Promise<void>;
};

export async function evaluateJobCompletionOrchestrator(
  videoId: string,
  deps: EvaluateCompletionDeps
): Promise<{
  allCompleted: boolean;
  completedJobs: DBVideoGenJob[];
  failedJobs: number;
}> {
  const jobs = await deps.findJobsByVideoId(videoId);

  if (jobs.length === 0) {
    return { allCompleted: false, completedJobs: [], failedJobs: 0 };
  }

  const completedJobs = filterAndSortCompletedJobs(jobs);
  const failedJobs = jobs.filter((job) => job.status === "failed").length;
  const allDone = jobs.every(
    (job) => job.status === "completed" || job.status === "failed"
  );
  const allFailed = jobs.every((job) => job.status === "failed");

  if (allFailed) {
    logger.error(
      { videoId, jobCount: jobs.length },
      "[VideoGenerationService] All jobs failed, cannot compose video"
    );
    await deps.markVideoFailed(videoId, "All video jobs failed");
    return { allCompleted: false, completedJobs: [], failedJobs };
  }

  if (!allDone || completedJobs.length === 0) {
    return { allCompleted: false, completedJobs, failedJobs };
  }

  return { allCompleted: true, completedJobs, failedJobs };
}
