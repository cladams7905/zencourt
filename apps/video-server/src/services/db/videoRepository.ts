import { and, count, eq, inArray, asc } from "drizzle-orm";
import { db, projects, videos } from "@db/client";
import type { VideoStatus } from "@shared/types/models";

export type DbVideo = typeof videos.$inferSelect;
export type DbProject = typeof projects.$inferSelect;

export interface VideoWithProject {
  video: DbVideo;
  project: DbProject | null;
}

class VideoRepository {
  private static readonly cancelableStatuses: VideoStatus[] = [
    "pending",
    "processing"
  ];

  private static resolveCancelReason(reason?: string): string {
    return reason?.trim() || "Canceled by user request";
  }

  async findById(videoId: string): Promise<DbVideo | null> {
    const [record] = await db
      .select()
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);

    return record ?? null;
  }

  async findByFalRequestId(requestId: string): Promise<VideoWithProject | null> {
    const [record] = await db
      .select({
        video: videos,
        project: projects
      })
      .from(videos)
      .leftJoin(projects, eq(projects.id, videos.projectId))
      .where(eq(videos.falRequestId, requestId))
      .limit(1);

    if (!record) {
      return null;
    }

    return {
      video: record.video,
      project: record.project ?? null
    };
  }

  async findByIdWithProject(videoId: string): Promise<VideoWithProject | null> {
    const [record] = await db
      .select({
        video: videos,
        project: projects
      })
      .from(videos)
      .leftJoin(projects, eq(projects.id, videos.projectId))
      .where(eq(videos.id, videoId))
      .limit(1);

    if (!record) {
      return null;
    }

    return {
      video: record.video,
      project: record.project ?? null
    };
  }

  async markSubmissionPending(options: {
    videoId: string;
    generationSettings?: Record<string, unknown>;
  }): Promise<void> {
    await db
      .update(videos)
      .set({
        status: "processing",
        generationSettings: options.generationSettings,
        updatedAt: new Date()
      })
      .where(eq(videos.id, options.videoId));
  }

  async attachFalRequestId(options: {
    videoId: string;
    falRequestId: string;
  }): Promise<void> {
    await db
      .update(videos)
      .set({
        falRequestId: options.falRequestId,
        updatedAt: new Date()
      })
      .where(eq(videos.id, options.videoId));
  }

  async markCompleted(options: {
    videoId: string;
    videoUrl: string;
    duration: number;
    thumbnailUrl?: string | null;
  }): Promise<void> {
    await db
      .update(videos)
      .set({
        status: "completed",
        videoUrl: options.videoUrl,
        duration: options.duration,
        thumbnailUrl: options.thumbnailUrl ?? null,
        errorMessage: null,
        updatedAt: new Date()
      })
      .where(eq(videos.id, options.videoId));
  }

  async markFailed(videoId: string, errorMessage: string): Promise<void> {
    await db
      .update(videos)
      .set({
        status: "failed",
        errorMessage,
        updatedAt: new Date()
      })
      .where(eq(videos.id, videoId));
  }

  async cancelVideosByProject(
    projectId: string,
    reason?: string
  ): Promise<number> {
    const canceled = await db
      .update(videos)
      .set({
        status: "canceled",
        errorMessage: VideoRepository.resolveCancelReason(reason),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(videos.projectId, projectId),
          inArray(videos.status, VideoRepository.cancelableStatuses)
        )
      )
      .returning({ id: videos.id });

    return canceled.length;
  }

  async cancelVideosByIds(
    videoIds: string[],
    reason?: string
  ): Promise<number> {
    if (videoIds.length === 0) {
      return 0;
    }

    const canceled = await db
      .update(videos)
      .set({
        status: "canceled",
        errorMessage: VideoRepository.resolveCancelReason(reason),
        updatedAt: new Date()
      })
      .where(
        and(
          inArray(videos.id, videoIds),
          inArray(videos.status, VideoRepository.cancelableStatuses)
        )
      )
      .returning({ id: videos.id });

    return canceled.length;
  }

  /**
   * Count completed room videos for a project
   * Used to determine if all room videos are ready for composition
   */
  async countCompletedRoomVideos(projectId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(videos)
      .where(
        and(
          eq(videos.projectId, projectId),
          eq(videos.status, "completed")
        )
      );

    return result?.count ?? 0;
  }

  /**
   * Count total room videos for a project (excluding canceled/failed)
   * Used to determine the total number of expected videos for composition
   */
  async countTotalRoomVideos(projectId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(videos)
      .where(eq(videos.projectId, projectId));

    return result?.count ?? 0;
  }

  /**
   * Get all completed room videos for a project
   * Used to retrieve video URLs for composition
   */
  async getCompletedRoomVideos(projectId: string): Promise<DbVideo[]> {
    return db
      .select()
      .from(videos)
      .where(
        and(
          eq(videos.projectId, projectId),
          eq(videos.status, "completed")
        )
      )
      .orderBy(asc(videos.createdAt));
  }
}

export const videoRepository = new VideoRepository();
