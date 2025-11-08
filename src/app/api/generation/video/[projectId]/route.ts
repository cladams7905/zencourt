/**
 * API Route: Get Final Video
 *
 * GET /api/generation/video/[projectId]
 * Retrieves the final generated video for a project
 */

import { NextRequest, NextResponse } from "next/server";
import { getFinalVideo } from "@/db/actions/videos";
import {
  ApiError,
  requireAuthenticatedUser,
  requireProjectAccess
} from "../../_utils";

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const user = await requireAuthenticatedUser();
    const project = await requireProjectAccess(projectId, user.id);

    // Get final video
    const finalVideo = await getFinalVideo(projectId);

    if (!finalVideo) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Final video not found. Generation may still be in progress."
        },
        { status: 404 }
      );
    }

    // Generate filename
    const projectName = project.title || "video";
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `${projectName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${timestamp}.mp4`;

    return NextResponse.json({
      success: true,
      video: {
        videoUrl: finalVideo.videoUrl,
        thumbnailUrl: finalVideo.thumbnailUrl,
        duration: finalVideo.duration,
        filename
      }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    console.error("[API] Error getting final video:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Failed to get final video"
      },
      { status: 500 }
    );
  }
}
