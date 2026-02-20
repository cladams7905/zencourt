import {
  db,
  eq,
  inArray,
  listings,
  videoGenBatch as videos,
  videoGenJobs as videoJobs
} from "@db/client";
import type { DBVideoGenJob } from "@shared/types/models";

export type VideoContextRecord = {
  videoId: string;
  listingId: string;
  userId: string;
};

export const videoGenerationDb = {
  findJobsByIds(jobIds: string[]): Promise<DBVideoGenJob[]> {
    return db.select().from(videoJobs).where(inArray(videoJobs.id, jobIds));
  },

  findJobById(jobId: string): Promise<DBVideoGenJob | null> {
    return db
      .select()
      .from(videoJobs)
      .where(eq(videoJobs.id, jobId))
      .limit(1)
      .then((rows) => rows[0] || null);
  },

  findJobByRequestId(requestId: string): Promise<DBVideoGenJob | null> {
    return db
      .select()
      .from(videoJobs)
      .where(eq(videoJobs.requestId, requestId))
      .limit(1)
      .then((rows) => rows[0] || null);
  },

  async attachRequestIdToJob(jobId: string, requestId: string): Promise<void> {
    await db
      .update(videoJobs)
      .set({
        requestId,
        updatedAt: new Date()
      })
      .where(eq(videoJobs.id, jobId));
  },

  async markVideoProcessing(videoId: string): Promise<void> {
    await db
      .update(videos)
      .set({
        status: "processing",
        updatedAt: new Date()
      })
      .where(eq(videos.id, videoId));
  },

  async markVideoFailed(videoId: string, errorMessage: string): Promise<void> {
    await db
      .update(videos)
      .set({
        status: "failed",
        errorMessage,
        updatedAt: new Date()
      })
      .where(eq(videos.id, videoId));
  },

  async markJobFailed(jobId: string, errorMessage: string): Promise<void> {
    await db
      .update(videoJobs)
      .set({
        status: "failed",
        errorMessage,
        updatedAt: new Date()
      })
      .where(eq(videoJobs.id, jobId));
  },

  async markJobProcessing(
    jobId: string,
    requestId: string,
    generationSettings: DBVideoGenJob["generationSettings"]
  ): Promise<void> {
    await db
      .update(videoJobs)
      .set({
        requestId,
        status: "processing",
        updatedAt: new Date(),
        generationSettings
      })
      .where(eq(videoJobs.id, jobId));
  },

  async markJobCompleted(
    jobId: string,
    updates: {
      videoUrl: string;
      thumbnailUrl: string | null;
      metadata: DBVideoGenJob["metadata"];
    }
  ): Promise<void> {
    await db
      .update(videoJobs)
      .set({
        status: "completed",
        videoUrl: updates.videoUrl,
        thumbnailUrl: updates.thumbnailUrl,
        metadata: updates.metadata,
        updatedAt: new Date()
      })
      .where(eq(videoJobs.id, jobId));
  },

  async markVideoCompleted(videoId: string, errorMessage: string | null): Promise<void> {
    await db
      .update(videos)
      .set({
        status: "completed",
        errorMessage,
        updatedAt: new Date()
      })
      .where(eq(videos.id, videoId));
  },

  findJobsByVideoId(videoId: string): Promise<DBVideoGenJob[]> {
    return db.select().from(videoJobs).where(eq(videoJobs.videoGenBatchId, videoId));
  },

  async getVideoContext(videoId: string): Promise<VideoContextRecord | null> {
    const [record] = await db
      .select({
        videoId: videos.id,
        listingId: videos.listingId,
        userId: listings.userId
      })
      .from(videos)
      .innerJoin(listings, eq(videos.listingId, listings.id))
      .where(eq(videos.id, videoId))
      .limit(1);

    if (!record?.videoId || !record?.listingId || !record?.userId) {
      return null;
    }

    return {
      videoId: record.videoId,
      listingId: record.listingId,
      userId: record.userId
    };
  }
};
