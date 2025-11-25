import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticatedUser,
  requireProjectAccess
} from "../../../_utils";
import { getProjectVideoStatus } from "@web/src/server/services/videoStatusService";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  if (!projectId) {
    return NextResponse.json(
      {
        success: false,
        error: "ProjectIdMissing",
        message: "projectId path parameter is required"
      },
      { status: 400 }
    );
  }

  const user = await requireAuthenticatedUser();
  await requireProjectAccess(projectId, user.id);

  try {
    const payload = await getProjectVideoStatus(projectId);
    return NextResponse.json({
      success: true,
      data: payload
    });
  } catch (error) {
    console.error("Failed to load video status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "VideoStatusError",
        message:
          error instanceof Error
            ? error.message
            : "Failed to load video status"
      },
      { status: 500 }
    );
  }
}
