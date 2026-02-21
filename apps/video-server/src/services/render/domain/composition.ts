/**
 * Composition helpers to reduce duplication between
 * videoGenerationService and renders.ts
 */

import type { RenderJobData } from "@/services/render";
import type { PreviewTextOverlay } from "@shared/types/video";

export interface CompletedJobLike {
  id: string;
  videoUrl: string | null;
  status: string;
  metadata?: { duration?: number } | null;
  generationSettings?: {
    sortOrder?: number;
    durationSeconds?: number;
    orientation?: "vertical" | "landscape";
  } | null;
}

export interface VideoContextLike {
  videoId: string;
  listingId: string;
  userId: string;
}

export interface CompositionClip {
  src: string;
  durationSeconds: number;
  textOverlay?: PreviewTextOverlay;
}

/**
 * Filter jobs to only completed ones with video URLs, sorted by sortOrder.
 */
export function filterAndSortCompletedJobs<T extends CompletedJobLike>(
  jobs: T[]
): T[] {
  return jobs
    .filter((job): job is T => job.status === "completed" && !!job.videoUrl)
    .sort((a, b) => {
      const orderA = a.generationSettings?.sortOrder ?? 0;
      const orderB = b.generationSettings?.sortOrder ?? 0;
      return orderA - orderB;
    });
}

/**
 * Build clips array from completed jobs for Remotion rendering.
 */
export function buildClipsFromJobs(
  jobs: CompletedJobLike[],
  textOverlaysByJobId?: Record<string, PreviewTextOverlay>
): CompositionClip[] {
  return jobs.map((job) => ({
    src: job.videoUrl!,
    durationSeconds:
      job.metadata?.duration ?? job.generationSettings?.durationSeconds ?? 5,
    textOverlay: textOverlaysByJobId?.[job.id]
  }));
}

/**
 * Get the orientation from the first job, defaulting to vertical.
 */
export function getOrientationFromJobs(
  jobs: CompletedJobLike[]
): "vertical" | "landscape" {
  return jobs[0]?.generationSettings?.orientation ?? "vertical";
}

/**
 * Build RenderJobData from video context and completed jobs.
 */
export function buildRenderJobData(
  videoContext: VideoContextLike,
  completedJobs: CompletedJobLike[],
  textOverlaysByJobId?: Record<string, PreviewTextOverlay>
): RenderJobData {
  const clips = buildClipsFromJobs(completedJobs, textOverlaysByJobId);
  const orientation = getOrientationFromJobs(completedJobs);

  return {
    videoId: videoContext.videoId,
    listingId: videoContext.listingId,
    userId: videoContext.userId,
    clips,
    orientation
  };
}
