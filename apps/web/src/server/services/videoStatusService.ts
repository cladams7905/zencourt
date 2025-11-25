import { db, videos, videoJobs } from "@db/client";
import { asc, desc, eq } from "drizzle-orm";
import type {
  FinalVideoUpdateEvent,
  InitialVideoStatusPayload,
  VideoJobUpdateEvent
} from "@web/src/types/video-status";

export async function getProjectVideoStatus(
  projectId: string
): Promise<InitialVideoStatusPayload> {
  const latestVideoResult = await db
    .select({
      id: videos.id,
      status: videos.status,
      videoUrl: videos.videoUrl,
      thumbnailUrl: videos.thumbnailUrl,
      errorMessage: videos.errorMessage,
      metadata: videos.metadata
    })
    .from(videos)
    .where(eq(videos.projectId, projectId))
    .orderBy(desc(videos.createdAt))
    .limit(1);

  const latestVideo = latestVideoResult[0];

  let jobs: VideoJobUpdateEvent[] = [];

  if (latestVideo) {
    const jobRows = await db
      .select({
        id: videoJobs.id,
        status: videoJobs.status,
        videoUrl: videoJobs.videoUrl,
        errorMessage: videoJobs.errorMessage,
        generationSettings: videoJobs.generationSettings
      })
      .from(videoJobs)
      .where(eq(videoJobs.videoId, latestVideo.id))
      .orderBy(asc(videoJobs.createdAt));

    jobs = jobRows.map((job) => ({
      projectId,
      jobId: job.id,
      status: job.status,
      videoUrl: job.videoUrl,
      errorMessage: job.errorMessage,
      roomId: job.generationSettings?.roomId,
      roomName: job.generationSettings?.roomName,
      sortOrder: job.generationSettings?.sortOrder ?? null
    }));
  }

  let finalVideo: FinalVideoUpdateEvent | undefined;

  if (latestVideo?.status === "completed" && latestVideo.videoUrl) {
    finalVideo = {
      projectId,
      status: "completed",
      finalVideoUrl: latestVideo.videoUrl,
      thumbnailUrl: latestVideo.thumbnailUrl ?? undefined,
      duration: latestVideo.metadata?.duration ?? null,
      errorMessage: latestVideo.errorMessage ?? null
    };
  } else if (latestVideo?.status === "failed") {
    finalVideo = {
      projectId,
      status: "failed",
      finalVideoUrl: latestVideo.videoUrl ?? undefined,
      thumbnailUrl: latestVideo.thumbnailUrl ?? undefined,
      duration: latestVideo.metadata?.duration ?? null,
      errorMessage: latestVideo.errorMessage ?? null
    };
  }

  return {
    jobs,
    finalVideo
  };
}
