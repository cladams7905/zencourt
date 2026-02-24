import { NextResponse } from "next/server";
import { ApiError } from "@web/src/app/api/v1/_utils";
import {
  apiErrorCodeFromStatus,
  apiErrorResponse,
  StatusCode
} from "@web/src/app/api/v1/_responses";
import { parseRequiredRouteParam } from "@shared/utils/api/parsers";
import { requireAuthenticatedUser } from "@web/src/server/utils/apiAuth";
import { requireListingAccess } from "@web/src/server/utils/listingAccess";
import { getListingImages } from "@web/src/server/models/listingImages";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const listingId = parseRequiredRouteParam((await params).listingId, "listingId");
    const user = await requireAuthenticatedUser();
    await requireListingAccess(listingId, user.id);
    const images = await getListingImages(user.id, listingId);
    return NextResponse.json({ success: true, data: images });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErrorResponse(
        error.status,
        apiErrorCodeFromStatus(error.status),
        error.body.message,
        { message: error.body.message }
      );
    }
    return apiErrorResponse(
      StatusCode.INTERNAL_SERVER_ERROR,
      "INTERNAL_ERROR",
      "Failed to fetch listing images"
    );
  }
}
