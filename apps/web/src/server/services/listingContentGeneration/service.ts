import {
  encodeSseEvent
} from "@web/src/lib/sse/sseEncoder";
import { consumeSseStream } from "@web/src/lib/sse/sseEventStream";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { requireListingAccess } from "@web/src/server/utils/listingAccess";
import {
  getCachedListingContent,
  setCachedListingContent,
  setCachedListingContentItem
} from "@web/src/server/services/cache/listingContent";
import { runContentGeneration } from "@web/src/server/services/contentGeneration";
import { resolveListingContext } from "./listingContext";
import { parseAndValidateParams } from "./requestValidation";
import { buildUpstreamRequestBody } from "./upstream";
import type {
  GenerateListingContentBody,
  ListingGenerationContext,
  ListingGeneratedItem
} from "./types";

const logger = createChildLogger(baseLogger, {
  module: "listing-content-generation-service"
});

type ContentStreamEvent =
  | { type: "delta"; text: string }
  | {
      type: "done";
      items: ListingGeneratedItem[];
      meta: { model: string; batch_size: number; cache_key_timestamp?: number };
    }
  | { type: "error"; message: string };

/**
 * Full listing-scoped content generation: resolve context, check cache,
 * generate via contentGeneration service if needed, write cache on done, return SSE response.
 */
export async function runListingContentGenerate(
  listingId: string,
  userId: string,
  body: GenerateListingContentBody | null
): Promise<{
  stream: ReadableStream;
  status: number;
}> {
  const listing = await requireListingAccess(listingId, userId);
  const validated = parseAndValidateParams(body, listingId);
  const context: ListingGenerationContext = resolveListingContext(
    listing,
    validated
  );

  const cachedItems = await getCachedListingContent(context.cacheKey);
  if (cachedItems && cachedItems.length > 0) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encodeSseEvent({
            type: "done",
            items: cachedItems,
            meta: { model: "cache", batch_size: cachedItems.length }
          })
        );
        controller.close();
      }
    });
    return { stream, status: 200 };
  }

  const upstreamBody = buildUpstreamRequestBody(context);
  const upstreamResponse = await runContentGeneration(userId, upstreamBody);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let doneItems: ListingGeneratedItem[] | null = null;
        let errored = false;

        await consumeSseStream<ContentStreamEvent>(
          upstreamResponse.stream,
          async (event) => {
            if (event.type === "delta" || event.type === "error") {
              controller.enqueue(encodeSseEvent(event));
              if (event.type === "error") errored = true;
            } else if (event.type === "done") {
              doneItems = event.items;
              if (!errored && doneItems && doneItems.length > 0) {
                await setCachedListingContent(context.cacheKey, doneItems);
                const timestamp = Date.now();
                for (let id = 0; id < doneItems.length; id += 1) {
                  const item = doneItems[id];
                  if (!item) continue;
                  await setCachedListingContentItem({
                    userId: context.userId,
                    listingId: context.listingId,
                    subcategory: context.subcategory,
                    mediaType: context.mediaType,
                    timestamp,
                    id,
                    item: {
                      ...item,
                      renderedImageUrl: null,
                      renderedTemplateId: undefined,
                      renderedModifications: undefined
                    }
                  });
                }
                controller.enqueue(
                  encodeSseEvent({
                    type: "done",
                    items: doneItems,
                    meta: {
                      model: "generated",
                      batch_size: doneItems.length,
                      cache_key_timestamp: timestamp
                    }
                  })
                );
              } else {
                controller.enqueue(encodeSseEvent(event));
              }
            }
          }
        );

        const hasNoItems =
          doneItems === null ||
          !Array.isArray(doneItems) ||
          (doneItems as ListingGeneratedItem[]).length === 0;
        if (hasNoItems) {
          controller.enqueue(
            encodeSseEvent({
              type: "error",
              message:
                "Listing content generation did not return completed items"
            })
          );
        }
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
      } finally {
        controller.close();
      }
    }
  });

  return {
    stream,
    status: 200
  };
}
