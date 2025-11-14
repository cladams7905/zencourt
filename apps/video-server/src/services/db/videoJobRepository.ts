import { and, eq, inArray } from "drizzle-orm";
import { db, videoJobs } from "@db/client";
import type { VideoStatus } from "@shared/types/models";

const CANCELABLE_STATUSES: VideoStatus[] = ["pending", "processing"];

function cancelReason(reason?: string): string {
  return reason?.trim() || "Canceled by user request";
}

export interface CreateVideoJobOptions {
  id: string;
  projectId: string;
  userId: string;
  status?: VideoStatus;
  compositionSettings?: Record<string, unknown>;
}

export interface AttachFalRequestIdOptions {
  jobId: string;
  falRequestId: string;
}

class VideoJobRepository {
  async findById(jobId: string) {
    const [job] = await db
      .select()
      .from(videoJobs)
      .where(eq(videoJobs.id, jobId))
      .limit(1);

    return job || null;
  }

  async create(options: CreateVideoJobOptions): Promise<void> {
    await db.insert(videoJobs).values({
      id: options.id,
      projectId: options.projectId,
      userId: options.userId,
      status: options.status ?? "pending",
      compositionSettings: options.compositionSettings,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  async attachFalRequestId(options: AttachFalRequestIdOptions): Promise<void> {
    await db
      .update(videoJobs)
      .set({
        updatedAt: new Date()
      })
      .where(eq(videoJobs.id, options.jobId));
  }

  async markSubmitted(jobId: string): Promise<void> {
    await db
      .update(videoJobs)
      .set({
        status: "processing",
        startedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(videoJobs.id, jobId));
  }

  async markFailed(jobId: string, errorMessage: string): Promise<void> {
    await db
      .update(videoJobs)
      .set({
        status: "failed",
        errorMessage,
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(videoJobs.id, jobId));
  }

  async cancelJobsByProject(
    projectId: string,
    reason?: string
  ): Promise<number> {
    const canceled = await db
      .update(videoJobs)
      .set({
        status: "canceled",
        errorMessage: cancelReason(reason),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(videoJobs.projectId, projectId),
          inArray(videoJobs.status, CANCELABLE_STATUSES)
        )
      )
      .returning({ id: videoJobs.id });

    return canceled.length;
  }
}

export const videoJobRepository = new VideoJobRepository();
