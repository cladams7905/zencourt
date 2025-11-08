import { stackServerApp } from "@/lib/stack/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getGenerationJobStatus } from "@/db/actions/generation";
import type { VideoSettings } from "@/services/videoGenerationOrchestrator";

type Project = typeof projects.$inferSelect;

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: { error: string; message: string }
  ) {
    super(body.message);
    this.name = "ApiError";
  }
}

export type AuthenticatedUser = NonNullable<
  Awaited<ReturnType<typeof stackServerApp.getUser>>
>;

export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const user = await stackServerApp.getUser();

  if (!user) {
    throw new ApiError(401, {
      error: "Unauthorized",
      message: "Please sign in to continue"
    });
  }

  return user;
}

export async function requireProjectAccess(
  projectId: string | null | undefined,
  userId: string
): Promise<Project> {
  if (!projectId) {
    throw new ApiError(400, {
      error: "Invalid request",
      message: "Project ID is required"
    });
  }

  const projectResult = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  const project = projectResult[0];

  if (!project) {
    throw new ApiError(404, {
      error: "Not found",
      message: "Project not found"
    });
  }

  if (project.userId !== userId) {
    throw new ApiError(403, {
      error: "Forbidden",
      message: "You don't have access to this project"
    });
  }

  return project;
}

export async function requireJobAccess(
  jobId: string | null | undefined,
  userId: string
) {
  if (!jobId) {
    throw new ApiError(400, {
      error: "Invalid request",
      message: "Job ID is required"
    });
  }

  const job = await getGenerationJobStatus(jobId);

  if (!job) {
    throw new ApiError(404, {
      error: "Not found",
      message: "Job not found"
    });
  }

  const project = await requireProjectAccess(job.projectId, userId);

  return { job, project };
}

export function validateVideoSettings(videoSettings?: VideoSettings) {
  if (!videoSettings) {
    throw new ApiError(400, {
      error: "Invalid request",
      message: "Video settings are required"
    });
  }

  if (!videoSettings.duration || !["5", "10"].includes(videoSettings.duration)) {
    throw new ApiError(400, {
      error: "Invalid request",
      message: "Duration must be 5 or 10 seconds"
    });
  }

  if (!videoSettings.roomOrder || videoSettings.roomOrder.length === 0) {
    throw new ApiError(400, {
      error: "Invalid request",
      message: "At least one room is required"
    });
  }

  return videoSettings;
}
