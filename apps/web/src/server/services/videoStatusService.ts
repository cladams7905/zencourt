import { db, assets, videoAssetJobs, videoAssets } from "@db/client";
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
      id: videoAssets.id,
      status: videoAssets.status,
      videoUrl: videoAssets.videoUrl,
      thumbnailUrl: videoAssets.thumbnailUrl,
      errorMessage: videoAssets.errorMessage,
      metadata: videoAssets.metadata
    })
    .from(videoAssets)
    .innerJoin(assets, eq(videoAssets.assetId, assets.id))
    .where(eq(assets.projectId, projectId))
    .orderBy(desc(videoAssets.createdAt))
    .limit(1);

  const latestVideo = latestVideoResult[0];

  let jobs: VideoJobUpdateEvent[] = [];

  if (latestVideo) {
    const jobRows = await db
      .select({
        id: videoAssetJobs.id,
        status: videoAssetJobs.status,
        videoUrl: videoAssetJobs.videoUrl,
        errorMessage: videoAssetJobs.errorMessage,
        generationSettings: videoAssetJobs.generationSettings
      })
      .from(videoAssetJobs)
      .where(eq(videoAssetJobs.videoAssetId, latestVideo.id))
      .orderBy(asc(videoAssetJobs.createdAt));

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
