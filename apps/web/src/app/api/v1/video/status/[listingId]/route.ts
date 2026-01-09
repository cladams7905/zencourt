import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticatedUser,
  requireListingAccess
} from "../../../_utils";
import { getListingVideoStatus } from "@web/src/server/services/videoStatusService";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  const { listingId } = await params;

  if (!listingId) {
    return NextResponse.json(
      {
        success: false,
        error: "ListingIdMissing",
        message: "listingId path parameter is required"
      },
      { status: 400 }
    );
  }

  const user = await requireAuthenticatedUser();
  await requireListingAccess(listingId, user.id);

  try {
    const payload = await getListingVideoStatus(listingId);
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
