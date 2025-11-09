"use server";

import { db } from "@/db";
import { projects } from "@/db";
import { eq, and, like, desc } from "drizzle-orm";
import type { Project } from "../../../types/schema";
import { getUser } from "./users";

/**
 * Create a new project
 * Server action that creates a project in the database
 *
 * @returns Promise<Project> - The created project
 * @throws Error if user is not authenticated or project creation fails
 */
export async function createProject(): Promise<Project> {
  const user = await getUser();

  // Generate unique project ID
  const projectId = `${user.id}_${Date.now()}`;

  // Insert project into database
  const [newProject] = await db
    .insert(projects)
    .values({
      id: projectId,
      userId: user.id,
      status: "uploading"
    })
    .returning();

  if (!newProject) {
    throw new Error("Failed to create project");
  }

  return newProject as Project;
}

/**
 * Update project
 * Server action that updates one or more fields of a project
 *
 * @param projectId - The ID of the project to update
 * @param updates - Partial project object with fields to update
 * @returns Promise<Project> - The updated project
 * @throws Error if user is not authenticated or update fails
 */
export async function updateProject(
  projectId: string,
  updates: Partial<Omit<Project, "id" | "userId" | "createdAt">>
): Promise<Project> {
  await getUser();

  // Update project in database
  const [updatedProject] = await db
    .update(projects)
    .set({
      ...updates,
      updatedAt: new Date()
    })
    .where(eq(projects.id, projectId))
    .returning();

  if (!updatedProject) {
    throw new Error("Failed to update project");
  }

  return updatedProject as Project;
}

/**
 * Get all projects for the current user
 * Server action that retrieves all projects belonging to the authenticated user
 *
 * @returns Promise<Project[]> - Array of user's projects
 * @throws Error if user is not authenticated
 */
export async function getUserProjects(): Promise<Project[]> {
  const user = await getUser();

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt));

  return userProjects as Project[];
}

/**
 * Get the next draft number for the user
 * Counts existing draft projects and returns the next sequential number
 *
 * @returns Promise<number> - The next draft number
 * @throws Error if user is not authenticated
 */
export async function getNextDraftNumber(): Promise<number> {
  const user = await getUser();

  // Get all projects with titles starting with "Draft "
  const draftProjects = await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, user.id), like(projects.title, "Draft %")));

  // Extract draft numbers and find the highest
  const draftNumbers = draftProjects
    .map((p) => {
      const match = p.title?.match(/^Draft (\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((num) => !isNaN(num));

  const maxDraftNumber =
    draftNumbers.length > 0 ? Math.max(...draftNumbers) : 0;

  return maxDraftNumber + 1;
}
