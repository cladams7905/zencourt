/**
 * API Route: Get Generation Progress
 *
 * GET /api/generation/progress?projectId=xxx
 * Retrieves the current progress of video generation for a project
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/stack/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getGenerationProgress } from "@/services/videoGenerationOrchestrator";

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to continue" },
        { status: 401 }
      );
    }

    // Get projectId from query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    // Validate request
    if (!projectId) {
      return NextResponse.json(
        { error: "Invalid request", message: "Project ID is required" },
        { status: 400 }
      );
    }

    // Verify project ownership
    const projectResult = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (projectResult.length === 0) {
      return NextResponse.json(
        { error: "Not found", message: "Project not found" },
        { status: 404 }
      );
    }

    const project = projectResult[0];
    if (project.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden", message: "You don't have access to this project" },
        { status: 403 }
      );
    }

    // Get generation progress (this will also process any pending videos)
    const progress = await getGenerationProgress(projectId, user.id);

    // Check if complete or failed
    const isComplete = progress.status === "completed";
    const hasFailed = progress.steps.some((s) => s.status === "failed");

    return NextResponse.json({
      success: true,
      progress,
      isComplete,
      hasFailed
    });
  } catch (error) {
    console.error("[API] Error getting generation progress:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get generation progress"
      },
      { status: 500 }
    );
  }
}
