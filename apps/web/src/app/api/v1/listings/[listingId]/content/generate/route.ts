import { NextRequest, NextResponse } from "next/server";
import {
  ApiError,
  requireAuthenticatedUser,
  requireListingAccess
} from "../../../../_utils";
import { apiErrorResponse } from "@web/src/app/api/v1/_responses";
import {
  readJsonBodySafe,
  requireNonEmptyParam
} from "@web/src/app/api/v1/_validation";
import { createChildLogger, logger as baseLogger } from "@web/src/lib/core/logging/logger";
import type {
  ListingContentSubcategory,
  ListingPropertyDetails
} from "@shared/types/models";
import { getSharedRedisClient } from "@web/src/lib/cache/redisClient";
import {
  encodeSseEvent,
  makeSseStreamHeaders
} from "@web/src/lib/sse/sseEncoder";
import { consumeSseStream } from "@web/src/lib/sse/sseStreamReader";
import {
  LISTING_CONTENT_CACHE_TTL_SECONDS,
  parseListingAddressParts,
  isListingSubcategory,
  isListingMediaType,
  buildListingPropertyFingerprint,
  buildListingContentCacheKey,
  type ListingMediaType
} from "@web/src/lib/domain/listing";

type ListingGeneratedItem = {
  hook: string;
  broll_query: string;
  body:
    | null
    | Array<{
        header: string;
        content: string;
        broll_query: string;
      }>;
  cta: string | null;
  caption: string;
};

type ContentStreamEvent =
  | { type: "delta"; text: string }
  | {
      type: "done";
      items: ListingGeneratedItem[];
      meta: { model: string; batch_size: number };
    }
  | { type: "error"; message: string };

const logger = createChildLogger(baseLogger, {
  module: "listing-content-generate-route"
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  // Perform auth + validation before opening the stream so we can return
  // proper HTTP error codes for bad requests.
  let listingId: string;
  let userId: string;
  let listing: Awaited<ReturnType<typeof requireListingAccess>>;
  let subcategory: ListingContentSubcategory;
  let mediaType: ListingMediaType;
  let addressParts: ReturnType<typeof parseListingAddressParts>;
  let resolvedState: string;
  let focus: string;
  let notes: string;
  let generationNonce: string;
  let propertyFingerprint: string;
  let cacheKey: string;
  let listingDetails: ListingPropertyDetails | null;
  let generatedItems: ListingGeneratedItem[] | null;

  try {
    listingId = requireNonEmptyParam((await params).listingId) ?? "";
    if (!listingId) {
      throw new ApiError(400, {
        error: "Invalid request",
        message: "Listing ID is required"
      });
    }
    const user = await requireAuthenticatedUser();
    userId = user.id;
    listing = await requireListingAccess(listingId, userId);

    const body = (await readJsonBodySafe(request)) as {
      subcategory?: string;
      media_type?: string;
      focus?: string;
      notes?: string;
      generation_nonce?: string;
    } | null;

    const subcategoryCandidate = body?.subcategory?.trim() ?? "";
    if (!subcategoryCandidate || !isListingSubcategory(subcategoryCandidate)) {
      throw new ApiError(400, {
        error: "Invalid request",
        message: "A valid listing subcategory is required"
      });
    }
    subcategory = subcategoryCandidate;

    const mediaTypeCandidate = body?.media_type?.trim().toLowerCase() ?? "video";
    if (!isListingMediaType(mediaTypeCandidate)) {
      throw new ApiError(400, {
        error: "Invalid request",
        message: "media_type must be either 'video' or 'image'"
      });
    }
    mediaType = mediaTypeCandidate;

    listingDetails =
      (listing.propertyDetails as ListingPropertyDetails | null) ?? null;
    const address =
      listingDetails?.address?.trim() || listing.address?.trim() || "";
    addressParts = parseListingAddressParts(address);
    const locationState = listingDetails?.location_context?.state?.trim() ?? "";
    resolvedState = locationState || addressParts.state;
    focus = body?.focus?.trim() ?? "";
    notes = body?.notes?.trim() ?? "";
    generationNonce = body?.generation_nonce?.trim() ?? "";
    propertyFingerprint = buildListingPropertyFingerprint(listingDetails);
    cacheKey = buildListingContentCacheKey({
      userId,
      listingId: listing.id,
      subcategory,
      mediaType,
      focus,
      notes,
      generation_nonce: generationNonce,
      propertyFingerprint
    });

    const redis = getSharedRedisClient();
    let cachedItems: ListingGeneratedItem[] | null = null;
    if (redis) {
      try {
        cachedItems = await redis.get<ListingGeneratedItem[]>(cacheKey);
      } catch (error) {
        logger.warn({ error, cacheKey }, "Failed reading listing content cache");
      }
    }
    generatedItems =
      cachedItems && Array.isArray(cachedItems) && cachedItems.length > 0
        ? cachedItems
        : null;
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErrorResponse(
        error.status,
        error.status === 401
          ? "UNAUTHORIZED"
          : error.status === 403
            ? "FORBIDDEN"
            : error.status === 404
              ? "NOT_FOUND"
              : "INVALID_REQUEST",
        error.body.message,
        { message: error.body.message }
      );
    }
    logger.error({ error }, "Failed to generate listing content (pre-stream)");
    return apiErrorResponse(
      500,
      "INTERNAL_ERROR",
      "Failed to generate listing content",
      { message: "Failed to generate listing content" }
    );
  }

  // --- SSE streaming response ---
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Redis / Upstash cache hit.
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

        // Fresh generation – proxy upstream SSE deltas to the client.
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
            body: JSON.stringify({
              category: "listing",
              audience_segments: [],
              agent_profile: {
                agent_name: "",
                brokerage_name: "",
                agent_title: "Realtor",
                city: addressParts.city,
                state: resolvedState,
                zip_code: addressParts.zipCode
              },
              listing_subcategory: subcategory,
              listing_property_details: listingDetails,
              content_request: {
                platform: "instagram",
                content_type:
                  mediaType === "video" ? "listing_reel" : "social_post",
                media_type: mediaType,
                focus,
                notes
              }
            }),
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

        // eslint-disable-next-line prefer-const
        let upstreamDoneItems: ListingGeneratedItem[] | null = null;
        let upstreamErrored = false;

        await consumeSseStream<ContentStreamEvent>(
          upstreamResponse.body,
          (event) => {
            if (event.type === "delta") {
              // Proxy delta to client for incremental JSON parsing.
              controller.enqueue(encodeSseEvent(event));
            } else if (event.type === "error") {
              controller.enqueue(encodeSseEvent(event));
              upstreamErrored = true;
            } else if (event.type === "done") {
              upstreamDoneItems = event.items;
            }
          }
        );

        if (upstreamErrored) {
          controller.close();
          return;
        }

        const doneItems = upstreamDoneItems as ListingGeneratedItem[] | null;
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

        // Cache in Redis.
        const redis = getSharedRedisClient();
        if (redis) {
          try {
            await redis.set(cacheKey, doneItems, {
              ex: LISTING_CONTENT_CACHE_TTL_SECONDS
            });
          } catch (error) {
            logger.warn(
              { error, cacheKey },
              "Failed writing listing content cache"
            );
          }
        }

        // Send final done event to client.
        controller.enqueue(
          encodeSseEvent({
            type: "done",
            items: doneItems,
            meta: {
              model: "generated",
              batch_size: doneItems.length
            }
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
