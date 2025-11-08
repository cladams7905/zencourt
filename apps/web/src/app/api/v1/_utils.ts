import { stackServerApp } from "../../../server/lib/stack/server";
import { db } from "@zencourt/db";
import { projects } from "@zencourt/db";
import { eq } from "drizzle-orm";

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
