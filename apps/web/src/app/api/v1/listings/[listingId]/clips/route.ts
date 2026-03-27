import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorCodeFromStatus,
  apiErrorResponse,
  StatusCode
} from "@web/src/app/api/v1/_responses";
import { ApiError } from "@web/src/app/api/v1/_utils";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { parseRequiredRouteParam } from "@shared/utils/api/parsers";
import { getListingClipVersionItemsForCurrentUser } from "@web/src/server/actions/listings/create/clips";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  return runWithCaller("api/v1/listings/clips", async () => {
    try {
      const listingId = parseRequiredRouteParam(
        (await params).listingId,
        "listingId"
      );
      const clipVersionItems =
        await getListingClipVersionItemsForCurrentUser(listingId);

      return NextResponse.json({
        success: true,
        data: {
          clipVersionItems
        }
      });
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
        error instanceof Error ? error.message : "Failed to load clip versions",
        {
          message:
            error instanceof Error
              ? error.message
              : "Failed to load clip versions"
        }
      );
    }
  });
}
