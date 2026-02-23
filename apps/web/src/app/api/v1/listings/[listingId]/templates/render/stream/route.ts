import { NextRequest } from "next/server";
import {
  ApiError,
  requireAuthenticatedUser,
  requireListingAccess
} from "../../../../../_utils";
import {
  apiErrorCodeFromStatus,
  apiErrorResponse,
  StatusCode
} from "@web/src/app/api/v1/_responses";
import { parseRequiredRouteParam } from "@shared/utils/api/parsers";
import { getListingImages } from "@web/src/server/actions/db/listingImages";
import { getOrCreateUserAdditional } from "@web/src/server/actions/db/userAdditional";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import {
  encodeSseEvent,
  makeSseStreamHeaders
} from "@web/src/lib/sse/sseEncoder";
import { renderListingTemplateBatchStream } from "@web/src/server/services/templateRender";
import { readJsonBodySafe } from "@shared/utils/api/validation";
import { parseListingSubcategory, sanitizeCaptionItems } from "../validation";

const logger = createChildLogger(baseLogger, {
  module: "listing-template-render-stream-route"
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  let listingId: string;
  let subcategory: ReturnType<typeof parseListingSubcategory>;
  let captionItems: ReturnType<typeof sanitizeCaptionItems>;
  let listing: Awaited<ReturnType<typeof requireListingAccess>>;
  let userId: string;
  let templateCount: number | undefined;

  try {
    listingId = parseRequiredRouteParam((await params).listingId, "listingId");
    const user = await requireAuthenticatedUser();
    userId = user.id;
    listing = await requireListingAccess(listingId, user.id);

    const body = (await readJsonBodySafe(request)) as {
      subcategory?: string;
      captionItems?: unknown;
      templateCount?: number;
    } | null;

    subcategory = parseListingSubcategory(body?.subcategory);
    captionItems = sanitizeCaptionItems(body?.captionItems);
    templateCount =
      typeof body?.templateCount === "number" && body.templateCount > 0
        ? body.templateCount
        : undefined;
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErrorResponse(
        error.status,
        apiErrorCodeFromStatus(error.status),
        error.body.message,
        { message: error.body.message }
      );
    }
    logger.error({ error }, "Template render stream setup failed");
    return apiErrorResponse(
      StatusCode.INTERNAL_SERVER_ERROR,
      "INTERNAL_ERROR",
      "Failed to start template render stream",
      { message: "Failed to start template render stream" }
    );
  }

  if (captionItems.length === 0) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encodeSseEvent({ type: "done", items: [], failedTemplateIds: [] })
        );
        controller.close();
      }
    });
    return new Response(stream, { headers: makeSseStreamHeaders() });
  }

  const [listingImages, userAdditional] = await Promise.all([
    getListingImages(userId, listing.id),
    getOrCreateUserAdditional(userId)
  ]);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { failedTemplateIds } = await renderListingTemplateBatchStream(
          {
            userId,
            listingId,
            subcategory,
            mediaType: "image",
            listing,
            listingImages,
            userAdditional,
            captionItems,
            templateCount,
            siteOrigin: request.nextUrl.origin
          },
          {
            onItem: async (item) => {
              controller.enqueue(encodeSseEvent({ type: "item", item }));
            }
          }
        );

        controller.enqueue(
          encodeSseEvent({
            type: "done",
            failedTemplateIds
          })
        );
      } catch (error) {
        logger.error({ error }, "Template render stream error");
        controller.enqueue(
          encodeSseEvent({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to render templates"
          })
        );
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, { headers: makeSseStreamHeaders() });
}
