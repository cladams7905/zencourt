import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@web/src/app/api/v1/_utils";
import {
  apiErrorCodeFromStatus,
  apiErrorResponse,
  StatusCode
} from "@web/src/app/api/v1/_responses";
import { parseRequiredRouteParam } from "@shared/utils/api/parsers";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getListingContentItemsForCurrentUser } from "@web/src/server/actions/listings/content/items";

const ROUTE_CALLER = "api/v1/listings/.../content";
const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 8;

function parsePaginationParams(searchParams: URLSearchParams) {
  const rawLimit = Number(searchParams.get("limit"));
  const rawOffset = Number(searchParams.get("offset"));

  return {
    limit: Number.isFinite(rawLimit)
      ? Math.min(MAX_PAGE_SIZE, Math.max(1, rawLimit))
      : DEFAULT_PAGE_SIZE,
    offset: Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  return runWithCaller(ROUTE_CALLER, async () => {
    try {
      const listingId = parseRequiredRouteParam(
        (await params).listingId,
        "listingId"
      );
      const { searchParams } = request.nextUrl;
      const { limit, offset } = parsePaginationParams(searchParams);

      const page = await getListingContentItemsForCurrentUser(listingId, {
        mediaTab:
          searchParams.get("mediaTab") === "images" ? "images" : "videos",
        subcategory:
          (searchParams.get("subcategory") as
            | Parameters<
                typeof getListingContentItemsForCurrentUser
              >[1]["subcategory"]
            | null) ?? undefined,
        limit,
        offset
      });

      return NextResponse.json({ success: true, data: page });
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
        "Failed to fetch listing create content"
      );
    }
  });
}
