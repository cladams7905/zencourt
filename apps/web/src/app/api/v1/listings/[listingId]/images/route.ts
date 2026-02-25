import { NextResponse } from "next/server";
import { ApiError } from "@web/src/app/api/v1/_utils";
import {
  apiErrorCodeFromStatus,
  apiErrorResponse,
  StatusCode
} from "@web/src/app/api/v1/_responses";
import { parseRequiredRouteParam } from "@shared/utils/api/parsers";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getListingImagesForCurrentUser } from "@web/src/server/actions/listings/commands";

const ROUTE_CALLER = "api/v1/listings/.../images";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ listingId: string }> }
) {
  return runWithCaller(ROUTE_CALLER, async () => {
    try {
      const listingId = parseRequiredRouteParam(
        (await params).listingId,
        "listingId"
      );
      const images = await getListingImagesForCurrentUser(listingId);
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
  });
}
