import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticatedUser,
  requireCampaignAccess
} from "../../../_utils";
import { getCampaignVideoStatus } from "@web/src/server/services/videoStatusService";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params;

  if (!campaignId) {
    return NextResponse.json(
      {
        success: false,
        error: "CampaignIdMissing",
        message: "campaignId path parameter is required"
      },
      { status: 400 }
    );
  }

  const user = await requireAuthenticatedUser();
  await requireCampaignAccess(campaignId, user.id);

  try {
    const payload = await getCampaignVideoStatus(campaignId);
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
