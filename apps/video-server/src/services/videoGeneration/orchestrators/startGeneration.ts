import logger from "@/config/logger";
import type { VideoServerGenerateRequest } from "@shared/types/api";
import type { DBVideoGenJob } from "@shared/types/models";

export type GenerationResult = {
  jobsStarted: number;
  failedJobs: string[];
};

type StartGenerationDeps = {
  findJobsByIds: (jobIds: string[]) => Promise<DBVideoGenJob[]>;
  markVideoProcessing: (videoId: string) => Promise<void>;
  markJobFailed: (jobId: string, errorMessage: string) => Promise<void>;
  markVideoFailed: (videoId: string, errorMessage: string) => Promise<void>;
  dispatchJob: (job: DBVideoGenJob) => Promise<void>;
  runWithConcurrency: <T>(
    items: T[],
    limit: number,
    handler: (item: T) => Promise<void>
  ) => Promise<void>;
};

function logStartGeneration(request: VideoServerGenerateRequest): void {
  const { videoId, listingId, userId, jobIds } = request;
  logger.info(
    {
      videoId,
      listingId,
      userId,
      jobCount: jobIds.length,
      jobIds
    },
    "[VideoGenerationService] Starting generation for jobs"
  );
}

async function loadAndValidateJobs(
  jobIds: string[],
  videoId: string,
  deps: StartGenerationDeps
): Promise<DBVideoGenJob[]> {
  const jobs = await deps.findJobsByIds(jobIds);

  if (jobs.length === 0) {
    throw new Error(`No video jobs found for jobIds: ${jobIds.join(", ")}`);
  }

  if (jobs.length !== jobIds.length) {
    logger.warn(
      {
        requested: jobIds.length,
        found: jobs.length,
        jobIds
      },
      "[VideoGenerationService] Some jobs not found in database"
    );
  }

  const invalidJobs = jobs.filter((job) => job.videoGenBatchId !== videoId);
  if (invalidJobs.length > 0) {
    throw new Error(
      `Jobs do not belong to video ${videoId}: ${invalidJobs
        .map((j) => j.id)
        .join(", ")}`
    );
  }

  return jobs;
}

async function markVideoProcessingAndLog(
  videoId: string,
  deps: StartGenerationDeps
): Promise<void> {
  await deps.markVideoProcessing(videoId);
  logger.info(
    { videoId },
    "[VideoGenerationService] Marked parent video as processing"
  );
}

function getConcurrency(): number {
  return Number(process.env.GENERATION_CONCURRENCY) || 3;
}

type DispatchOutcome = {
  successCount: number;
  failedJobs: string[];
};

async function dispatchJobsWithConcurrency(
  jobs: DBVideoGenJob[],
  concurrency: number,
  videoId: string,
  deps: StartGenerationDeps
): Promise<DispatchOutcome> {
  const failedJobs: string[] = [];
  let successCount = 0;

  await deps.runWithConcurrency(jobs, concurrency, async (job) => {
    try {
      await deps.dispatchJob(job);
      successCount += 1;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to dispatch job to provider";

      logger.error(
        { jobId: job.id, videoId, error: errorMessage },
        "[VideoGenerationService] Failed to dispatch job"
      );

      failedJobs.push(job.id);
      await deps.markJobFailed(job.id, errorMessage);
    }
  });

  return { successCount, failedJobs };
}

async function ensureAtLeastOneJobSucceeded(
  successCount: number,
  videoId: string,
  deps: StartGenerationDeps
): Promise<void> {
  if (successCount === 0) {
    await deps.markVideoFailed(videoId, "All video jobs failed to dispatch");
    throw new Error("All video jobs failed to dispatch");
  }
}

function logDispatchCompleted(
  videoId: string,
  totalJobs: number,
  successCount: number,
  failedCount: number
): void {
  logger.info(
    {
      videoId,
      totalJobs,
      successCount,
      failedCount
    },
    "[VideoGenerationService] Generation dispatch completed"
  );
}

function buildGenerationResult(
  successCount: number,
  failedJobs: string[]
): GenerationResult {
  return {
    jobsStarted: successCount,
    failedJobs
  };
}

export async function startGenerationOrchestrator(
  request: VideoServerGenerateRequest,
  deps: StartGenerationDeps
): Promise<GenerationResult> {
  const { videoId, jobIds } = request;

  logStartGeneration(request);

  const jobs = await loadAndValidateJobs(jobIds, videoId, deps);

  await markVideoProcessingAndLog(videoId, deps);

  const concurrency = getConcurrency();
  const { successCount, failedJobs } = await dispatchJobsWithConcurrency(
    jobs,
    concurrency,
    videoId,
    deps
  );

  await ensureAtLeastOneJobSucceeded(successCount, videoId, deps);

  logDispatchCompleted(videoId, jobs.length, successCount, failedJobs.length);

  return buildGenerationResult(successCount, failedJobs);
}
