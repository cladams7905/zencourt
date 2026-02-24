import { NextRequest } from "next/server";
import {
  ApiError,
  requireAuthenticatedUser,
  requireListingAccess
} from "@web/src/app/api/v1/_utils";
import {
  apiErrorCodeFromStatus,
  apiErrorResponse,
  StatusCode
} from "@web/src/app/api/v1/_responses";
import { parseRequiredRouteParam } from "@shared/utils/api/parsers";
import { LISTING_CONTENT_SUBCATEGORIES } from "@shared/types/models";
import { deleteCachedListingContentItem } from "@web/src/server/services/cache/listingContent";
import { readJsonBodySafe } from "@shared/utils/api/validation";

const MEDIA_TYPE_IMAGE = "image" as const;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const listingId = parseRequiredRouteParam(
      (await params).listingId,
      "listingId"
    );
    const user = await requireAuthenticatedUser();
    await requireListingAccess(listingId, user.id);

    const body = (await readJsonBodySafe(request)) as {
      cacheKeyTimestamp?: number;
      cacheKeyId?: number;
      subcategory?: string;
    } | null;

    const cacheKeyTimestamp = body?.cacheKeyTimestamp;
    const cacheKeyId = body?.cacheKeyId;
    const subcategoryRaw = body?.subcategory?.trim();

    if (
      typeof cacheKeyTimestamp !== "number" ||
      typeof cacheKeyId !== "number" ||
      !subcategoryRaw ||
      !(LISTING_CONTENT_SUBCATEGORIES as readonly string[]).includes(
        subcategoryRaw
      )
    ) {
      throw new ApiError(StatusCode.BAD_REQUEST, {
        error: "Invalid request",
        message:
          "cacheKeyTimestamp, cacheKeyId, and valid subcategory are required"
      });
    }

    await deleteCachedListingContentItem({
      userId: user.id,
      listingId,
      subcategory: subcategoryRaw as (typeof LISTING_CONTENT_SUBCATEGORIES)[number],
      mediaType: MEDIA_TYPE_IMAGE,
      timestamp: cacheKeyTimestamp,
      id: cacheKeyId
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
