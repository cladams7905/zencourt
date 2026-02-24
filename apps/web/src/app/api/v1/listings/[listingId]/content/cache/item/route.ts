import { NextRequest } from "next/server";
import { ApiError } from "@web/src/app/api/v1/_utils";
import {
  apiErrorCodeFromStatus,
  apiErrorResponse,
  StatusCode
} from "@web/src/app/api/v1/_responses";
import { parseRequiredRouteParam } from "@shared/utils/api/parsers";
import { readJsonBodySafe } from "@shared/utils/api/validation";
import { deleteCachedListingContentItem } from "@web/src/server/actions/api/listings/cache";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const listingId = parseRequiredRouteParam(
      (await params).listingId,
      "listingId"
    );

    const body = (await readJsonBodySafe(request)) as {
      cacheKeyTimestamp?: number;
      cacheKeyId?: number;
      subcategory?: string;
    } | null;

    await deleteCachedListingContentItem(listingId, {
      cacheKeyTimestamp: body?.cacheKeyTimestamp ?? 0,
      cacheKeyId: body?.cacheKeyId ?? 0,
      subcategory: body?.subcategory ?? ""
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof ApiError) {
      return apiErrorResponse(
        err.status,
        apiErrorCodeFromStatus(err.status),
        err.body.message,
        { message: err.body.message }
      );
    }
    throw err;
  }
}
