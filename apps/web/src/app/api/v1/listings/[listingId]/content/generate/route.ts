import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import {
  ApiError,
  requireAuthenticatedUser,
  requireListingAccess
} from "../../../../_utils";
import {
  createContent,
  getContentByListingId
} from "@web/src/server/actions/db/content";
import { createChildLogger, logger as baseLogger } from "@web/src/lib/logger";
import type {
  DBContent,
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

function parseStreamEvents(streamText: string): ContentStreamEvent[] {
  const chunks = streamText.split("\n\n");
  const events: ContentStreamEvent[] = [];

  for (const chunk of chunks) {
    const line = chunk
      .split("\n")
      .find((entry) => entry.startsWith("data:"));
    if (!line) {
      continue;
    }

    const payload = line.replace(/^data:\s*/, "");
    if (!payload) {
      continue;
    }

    try {
      const parsed = JSON.parse(payload) as ContentStreamEvent;
      events.push(parsed);
    } catch {
      // Ignore malformed event chunks.
    }
  }

  return events;
}

function findCompletedItems(events: ContentStreamEvent[]): ListingGeneratedItem[] {
  const errorEvent = events.find((event) => event.type === "error");
  if (errorEvent && errorEvent.type === "error") {
    throw new ApiError(502, {
      error: "Upstream error",
      message: errorEvent.message || "Listing content generation failed"
    });
  }

  const doneEvent = events.find((event) => event.type === "done");
  if (!doneEvent || doneEvent.type !== "done") {
    throw new ApiError(502, {
      error: "Invalid response",
      message: "Listing content generation did not return completed items"
    });
  }

  if (!Array.isArray(doneEvent.items) || doneEvent.items.length === 0) {
    throw new ApiError(502, {
      error: "Invalid response",
      message: "Listing content generation returned no items"
    });
  }

  return doneEvent.items;
}

function normalizeContentRecordForResponse(record: DBContent) {
  return {
    id: record.id,
    status: record.status,
    contentType: record.contentType,
    metadata: record.metadata
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;
    const user = await requireAuthenticatedUser();
    const listing = await requireListingAccess(listingId, user.id);

    const body = (await request.json()) as {
      subcategory?: string;
      media_type?: string;
      focus?: string;
      notes?: string;
      generation_nonce?: string;
    };

    const subcategory = body.subcategory?.trim() ?? "";
    if (!subcategory || !isListingSubcategory(subcategory)) {
      throw new ApiError(400, {
        error: "Invalid request",
        message: "A valid listing subcategory is required"
      });
    }
    const mediaTypeCandidate = body.media_type?.trim().toLowerCase() ?? "video";
    if (!isListingMediaType(mediaTypeCandidate)) {
      throw new ApiError(400, {
        error: "Invalid request",
        message: "media_type must be either 'video' or 'image'"
      });
    }
    const mediaType: ListingMediaType = mediaTypeCandidate;

    const listingDetails =
      (listing.propertyDetails as ListingPropertyDetails | null) ?? null;
    const address =
      listingDetails?.address?.trim() || listing.address?.trim() || "";
    const addressParts = parseListingAddressParts(address);
    const locationState = listingDetails?.location_context?.state?.trim() ?? "";
    const resolvedState = locationState || addressParts.state;
    const focus = body.focus?.trim() ?? "";
    const notes = body.notes?.trim() ?? "";
    const generationNonce = body.generation_nonce?.trim() ?? "";
    const propertyFingerprint = buildListingPropertyFingerprint(listingDetails);
    const cacheKey = buildListingContentCacheKey({
      userId: user.id,
      listingId: listing.id,
      subcategory,
      mediaType,
      focus,
      notes,
      generation_nonce: generationNonce,
      propertyFingerprint
    });

    const existingListingContent = await getContentByListingId(user.id, listing.id);
    const existingForCacheKey = existingListingContent.filter((entry) => {
      const metadata = entry.metadata as Record<string, unknown> | null;
      const metadataMediaType =
        metadata?.mediaType === "image" || metadata?.mediaType === "video"
          ? metadata.mediaType
          : "video";
      return (
        metadata?.listingSubcategory === subcategory &&
        metadataMediaType === mediaType &&
        metadata?.cacheKey === cacheKey
      );
    });

    if (existingForCacheKey.length > 0) {
      return NextResponse.json({
        success: true,
        listingId: listing.id,
        subcategory,
        count: existingForCacheKey.length,
        mediaType,
        source: "db-cache-hit",
        items: existingForCacheKey.map(normalizeContentRecordForResponse)
      });
    }

    const redis = getRedisClient();
    let cachedItems: ListingGeneratedItem[] | null = null;
    if (redis) {
      try {
        cachedItems = await redis.get<ListingGeneratedItem[]>(cacheKey);
      } catch (error) {
        logger.warn({ error, cacheKey }, "Failed reading listing content cache");
      }
    }
    const generatedItems =
      cachedItems && Array.isArray(cachedItems) && cachedItems.length > 0
        ? cachedItems
        : null;

    let resolvedGeneratedItems: ListingGeneratedItem[];
    if (generatedItems) {
      resolvedGeneratedItems = generatedItems;
    } else {
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
        throw new ApiError(upstreamResponse.status, {
          error: "Upstream error",
          message:
            (errorPayload as { message?: string }).message ||
            "Failed to generate listing content"
        });
      }

      const streamText = await upstreamResponse.text();
      const events = parseStreamEvents(streamText);
      resolvedGeneratedItems = findCompletedItems(events);
      if (redis) {
        try {
          await redis.set(cacheKey, resolvedGeneratedItems, {
            ex: LISTING_CONTENT_CACHE_TTL_SECONDS
          });
        } catch (error) {
          logger.warn({ error, cacheKey }, "Failed writing listing content cache");
        }
      }
    }

    const savedContent = await Promise.all(
      resolvedGeneratedItems.map((item, index) =>
        createContent(user.id, {
          listingId: listing.id,
          contentType: "post",
          status: "draft",
          contentUrl: null,
          thumbnailUrl: null,
          metadata: {
            listingSubcategory: subcategory,
            mediaType,
            promptCategory: "listing",
            promptVersion: "listing-v1",
            sortOrder: index,
            source: "listing-content-generate-route",
            cacheKey,
            propertyFingerprint,
            hook: item.hook,
            caption: item.caption,
            body: item.body,
            cta: item.cta,
            broll_query: item.broll_query
          }
        })
      )
    );

    return NextResponse.json({
      success: true,
      listingId: listing.id,
      subcategory,
      mediaType,
      count: savedContent.length,
      source: generatedItems ? "upstash-cache-hit" : "generated",
      items: savedContent.map(normalizeContentRecordForResponse)
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }

    logger.error({ error }, "Failed to generate listing content");
    return NextResponse.json(
      {
        error: "Server error",
        message: "Failed to generate listing content"
      },
      { status: 500 }
    );
  }
}
