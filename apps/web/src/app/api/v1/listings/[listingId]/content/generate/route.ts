import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import {
  ApiError,
  requireAuthenticatedUser,
  requireListingAccess
} from "../../../../_utils";
import { createChildLogger, logger as baseLogger } from "@web/src/lib/core/logging/logger";
import type {
  ListingContentSubcategory,
  ListingPropertyDetails
} from "@shared/types/models";
import { LISTING_CONTENT_SUBCATEGORIES } from "@shared/types/models";
import { Redis } from "@upstash/redis";

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

type ListingMediaType = "video" | "image";

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
const LISTING_CONTENT_CACHE_PREFIX = "listing-content";
const LISTING_CONTENT_CACHE_TTL_SECONDS = 60 * 60 * 12;
let redisClient: Redis | null | undefined;

function parseListingAddressParts(address?: string | null): {
  city: string;
  state: string;
  zipCode: string;
} {
  const normalized = (address ?? "").trim();
  if (!normalized) {
    return { city: "", state: "", zipCode: "" };
  }

  const zipMatch = normalized.match(/\b\d{5}(?:-\d{4})?\b/);
  const zipCode = zipMatch?.[0] ?? "";

  const segments = normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const city = segments.length >= 2 ? segments[segments.length - 2] : "";

  let state = "";
  if (segments.length > 0) {
    const tail = segments[segments.length - 1];
    const stateMatch = tail.match(/\b[A-Z]{2}\b/);
    state = stateMatch?.[0] ?? "";
  }

  return { city, state, zipCode };
}

function isListingSubcategory(value: string): value is ListingContentSubcategory {
  return (
    LISTING_CONTENT_SUBCATEGORIES as readonly string[]
  ).includes(value);
}

function isListingMediaType(value: string): value is ListingMediaType {
  return value === "video" || value === "image";
}

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

function buildListingPropertyFingerprint(
  listingPropertyDetails?: ListingPropertyDetails | null
): string {
  return createHash("sha256")
    .update(JSON.stringify(listingPropertyDetails ?? {}))
    .digest("hex")
    .slice(0, 16);
}

function buildListingContentCacheKey(params: {
  userId: string;
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
  focus: string;
  notes: string;
  generation_nonce: string;
  propertyFingerprint: string;
}): string {
  const focusHash = createHash("sha1")
    .update(`${params.focus}::${params.notes}::${params.generation_nonce}`)
    .digest("hex")
    .slice(0, 10);
  return [
    LISTING_CONTENT_CACHE_PREFIX,
    params.userId,
    params.listingId,
    params.subcategory,
    params.mediaType,
    params.propertyFingerprint,
    focusHash
  ].join(":");
}

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
    ({ listingId } = await params);
    const user = await requireAuthenticatedUser();
    userId = user.id;
    listing = await requireListingAccess(listingId, userId);

    const body = (await request.json()) as {
      subcategory?: string;
      media_type?: string;
      focus?: string;
      notes?: string;
      generation_nonce?: string;
    };

    const subcategoryCandidate = body.subcategory?.trim() ?? "";
    if (!subcategoryCandidate || !isListingSubcategory(subcategoryCandidate)) {
      throw new ApiError(400, {
        error: "Invalid request",
        message: "A valid listing subcategory is required"
      });
    }
    subcategory = subcategoryCandidate;

    const mediaTypeCandidate = body.media_type?.trim().toLowerCase() ?? "video";
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
    focus = body.focus?.trim() ?? "";
    notes = body.notes?.trim() ?? "";
    generationNonce = body.generation_nonce?.trim() ?? "";
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

    const redis = getRedisClient();
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
      return NextResponse.json(error.body, { status: error.status });
    }
    logger.error({ error }, "Failed to generate listing content (pre-stream)");
    return NextResponse.json(
      { error: "Server error", message: "Failed to generate listing content" },
      { status: 500 }
    );
  }

  // --- SSE streaming response ---
  const encoder = new TextEncoder();
  const sseEvent = (event: ContentStreamEvent) =>
    encoder.encode(`data: ${JSON.stringify(event)}\n\n`);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Redis / Upstash cache hit.
        if (generatedItems) {
          controller.enqueue(
            sseEvent({
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
          controller.enqueue(sseEvent({ type: "error", message }));
          controller.close();
          return;
        }

        const reader = upstreamResponse.body?.getReader();
        if (!reader) {
          controller.enqueue(
            sseEvent({
              type: "error",
              message: "Streaming response not available from upstream"
            })
          );
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let upstreamDoneItems: ListingGeneratedItem[] | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part
              .split("\n")
              .find((entry) => entry.startsWith("data:"));
            if (!line) continue;

            const payload = line.replace(/^data:\s*/, "");
            if (!payload) continue;

            let event: ContentStreamEvent;
            try {
              event = JSON.parse(payload) as ContentStreamEvent;
            } catch {
              continue;
            }

            if (event.type === "delta") {
              // Proxy delta to client for incremental JSON parsing.
              controller.enqueue(sseEvent(event));
            } else if (event.type === "error") {
              controller.enqueue(sseEvent(event));
              controller.close();
              return;
            } else if (event.type === "done") {
              upstreamDoneItems = event.items;
            }
          }
        }

        if (!upstreamDoneItems || upstreamDoneItems.length === 0) {
          controller.enqueue(
            sseEvent({
              type: "error",
              message:
                "Listing content generation did not return completed items"
            })
          );
          controller.close();
          return;
        }

        // Cache in Redis.
        const redis = getRedisClient();
        if (redis) {
          try {
            await redis.set(cacheKey, upstreamDoneItems, {
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
          sseEvent({
            type: "done",
            items: upstreamDoneItems,
            meta: {
              model: "generated",
              batch_size: upstreamDoneItems.length
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
          controller.enqueue(sseEvent({ type: "error", message }));
        } catch {
          // Controller may already be closed.
        }
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
}
