import { NextRequest } from "next/server";
import {
  ApiError,
  requireAuthenticatedUser,
  requireListingAccess
} from "../../../../_utils";
import {
  apiErrorCodeFromStatus,
  apiErrorResponse
} from "@web/src/app/api/v1/_responses";
import { StatusCode } from "@web/src/app/api/v1/_statusCodes";
import { readJsonBodySafe } from "@web/src/app/api/v1/_validation";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import {
  encodeSseEvent,
  makeSseStreamHeaders
} from "@web/src/lib/sse/sseEncoder";
import type { GenerateListingContentBody } from "./services/types";
import {
  getCachedListingContent,
  setCachedListingContent
} from "./services/cache";
import { resolveListingContext } from "./services/listingContext";
import { parseAndValidateParams } from "./services/requestValidation";
import {
  buildUpstreamRequestBody,
  consumeUpstreamListingStream
} from "./services/upstream";

const logger = createChildLogger(baseLogger, {
  module: "listing-content-generate-route"
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  let context: Awaited<ReturnType<typeof resolveListingContext>>;
  let generatedItems: Awaited<ReturnType<typeof getCachedListingContent>>;

  try {
    const resolvedParams = await params;
    const body = (await readJsonBodySafe(request)) as GenerateListingContentBody | null;
    const validated = parseAndValidateParams(body, resolvedParams.listingId);

    const user = await requireAuthenticatedUser();
    const listing = await requireListingAccess(validated.listingId, user.id);
    context = resolveListingContext(listing, validated);
    generatedItems = await getCachedListingContent(context.cacheKey);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErrorResponse(
        error.status,
        apiErrorCodeFromStatus(error.status),
        error.body.message,
        { message: error.body.message }
      );
    }
    logger.error({ error }, "Failed to generate listing content (pre-stream)");
    return apiErrorResponse(
      StatusCode.INTERNAL_SERVER_ERROR,
      "INTERNAL_ERROR",
      "Failed to generate listing content",
      { message: "Failed to generate listing content" }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (generatedItems) {
          controller.enqueue(
            encodeSseEvent({
              type: "done",
              items: generatedItems,
              meta: { model: "cache", batch_size: generatedItems.length }
            })
          );
          controller.close();
          return;
        }

        const upstreamResponse = await fetch(
          `${request.nextUrl.origin}/api/v1/content/generate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(request.headers.get("cookie")
                ? { cookie: request.headers.get("cookie") as string }
                : {})
            },
            body: JSON.stringify(buildUpstreamRequestBody(context)),
            cache: "no-store"
          }
        );

        if (!upstreamResponse.ok) {
          const errorPayload = await upstreamResponse.json().catch(() => ({}));
          const message =
            (errorPayload as { message?: string }).message ||
            "Failed to generate listing content";
          controller.enqueue(encodeSseEvent({ type: "error", message }));
          controller.close();
          return;
        }

        if (!upstreamResponse.body) {
          controller.enqueue(
            encodeSseEvent({
              type: "error",
              message: "Streaming response not available from upstream"
            })
          );
          controller.close();
          return;
        }

        const { doneItems, errored } = await consumeUpstreamListingStream(
          upstreamResponse.body,
          {
            onEvent(event) {
              if (event.type === "delta" || event.type === "error") {
                controller.enqueue(encodeSseEvent(event));
              }
            }
          }
        );

        if (errored) {
          controller.close();
          return;
        }

        if (!doneItems || doneItems.length === 0) {
          controller.enqueue(
            encodeSseEvent({
              type: "error",
              message:
                "Listing content generation did not return completed items"
            })
          );
          controller.close();
          return;
        }

        await setCachedListingContent(context.cacheKey, doneItems);

        controller.enqueue(
          encodeSseEvent({
            type: "done",
            items: doneItems,
            meta: { model: "generated", batch_size: doneItems.length }
          })
        );
        controller.close();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to generate listing content";
        logger.error({ error }, "Listing content stream error");
        try {
          controller.enqueue(encodeSseEvent({ type: "error", message }));
        } catch {
          // Controller may already be closed.
        }
        controller.close();
      }
    }
  });

  return new Response(stream, { headers: makeSseStreamHeaders() });
}
