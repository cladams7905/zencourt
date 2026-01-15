import { db, content, videoContentJobs, videoContent } from "@db/client";
import { asc, desc, eq } from "drizzle-orm";
import type {
  FinalVideoUpdateEvent,
  InitialVideoStatusPayload,
  VideoJobUpdateEvent
} from "@web/src/types/video-status";
import { getSignedDownloadUrlSafe } from "../utils/storageUrls";

const VIDEO_STATUS_URL_TTL_SECONDS = 6 * 60 * 60; // 6 hours

export async function getListingVideoStatus(
  listingId: string
): Promise<InitialVideoStatusPayload> {
  const latestVideoResult = await db
    .select({
      id: videoContent.id,
      status: videoContent.status,
      videoUrl: videoContent.videoUrl,
      thumbnailUrl: videoContent.thumbnailUrl,
      errorMessage: videoContent.errorMessage,
      metadata: videoContent.metadata
    })
    .from(videoContent)
    .innerJoin(content, eq(videoContent.contentId, content.id))
    .where(eq(content.listingId, listingId))
    .orderBy(desc(videoContent.createdAt))
    .limit(1);

  const latestVideo = latestVideoResult[0];

  let jobs: VideoJobUpdateEvent[] = [];

  if (latestVideo) {
    const jobRows = await db
      .select({
        id: videoContentJobs.id,
        status: videoContentJobs.status,
        videoUrl: videoContentJobs.videoUrl,
        errorMessage: videoContentJobs.errorMessage,
        generationSettings: videoContentJobs.generationSettings
      })
      .from(videoContentJobs)
      .where(eq(videoContentJobs.videoContentId, latestVideo.id))
      .orderBy(asc(videoContentJobs.createdAt));

    jobs = await Promise.all(
      jobRows.map(async (job) => {
        const signedVideoUrl = await getSignedDownloadUrlSafe(
          job.videoUrl,
          VIDEO_STATUS_URL_TTL_SECONDS
        );
        return {
          listingId,
          jobId: job.id,
          status: job.status,
          videoUrl: signedVideoUrl ?? job.videoUrl,
          errorMessage: job.errorMessage,
          roomId: job.generationSettings?.roomId,
          roomName: job.generationSettings?.roomName,
          sortOrder: job.generationSettings?.sortOrder ?? null
        };
      })
    );
  }

  let finalVideo: FinalVideoUpdateEvent | undefined;

  if (latestVideo?.status === "completed" && latestVideo.videoUrl) {
    const [signedVideoUrl, signedThumbnailUrl] = await Promise.all([
      getSignedDownloadUrlSafe(
        latestVideo.videoUrl,
        VIDEO_STATUS_URL_TTL_SECONDS
      ),
      getSignedDownloadUrlSafe(
        latestVideo.thumbnailUrl,
        VIDEO_STATUS_URL_TTL_SECONDS
      )
    ]);
    finalVideo = {
      listingId,
      status: "completed",
      finalVideoUrl: signedVideoUrl ?? latestVideo.videoUrl,
      thumbnailUrl: signedThumbnailUrl ?? latestVideo.thumbnailUrl ?? undefined,
      duration: latestVideo.metadata?.duration ?? null,
      errorMessage: latestVideo.errorMessage ?? null
    };
  } else if (latestVideo?.status === "failed") {
    const [signedVideoUrl, signedThumbnailUrl] = await Promise.all([
      getSignedDownloadUrlSafe(
        latestVideo.videoUrl,
        VIDEO_STATUS_URL_TTL_SECONDS
      ),
      getSignedDownloadUrlSafe(
        latestVideo.thumbnailUrl,
        VIDEO_STATUS_URL_TTL_SECONDS
      )
    ]);
    finalVideo = {
      listingId,
      status: "failed",
      finalVideoUrl: signedVideoUrl ?? latestVideo.videoUrl ?? undefined,
      thumbnailUrl: signedThumbnailUrl ?? latestVideo.thumbnailUrl ?? undefined,
      duration: latestVideo.metadata?.duration ?? null,
      errorMessage: latestVideo.errorMessage ?? null
    };
  }

  return {
    jobs,
    finalVideo
  };
}
