import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, listingImages, listings } from "@db/client";
import storageService from "@web/src/server/services/storage";
import { createChildLogger, logger as baseLogger } from "@web/src/lib/core/logging/logger";
import {
  ApiError,
  requireAuthenticatedUser
} from "../../_utils";

const logger = createChildLogger(baseLogger, { module: "storage-image-proxy" });
const SIGNED_URL_TTL_SECONDS = 60 * 10; // Signed links stay valid for 10 minutes
const CLIENT_CACHE_MAX_AGE = 60 * 60 * 24 * 30; // 30 day browser cache for immutable objects
const EDGE_CACHE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days at CDN / Vercel edge

function fail(status: number, message: string): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const encodedUrl = request.nextUrl.searchParams.get("url");

  logger.debug({ encodedUrl }, "Received image proxy request");

  if (!encodedUrl) {
    return fail(400, "Missing required 'url' query parameter");
  }

  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(encodedUrl);
    logger.debug({ decodedUrl }, "Decoded URL");
  } catch (error) {
    logger.warn({ error, encodedUrl }, "Failed to decode image URL");
    return fail(400, "Invalid image URL");
  }

  let userId: string;
  try {
    const user = await requireAuthenticatedUser();
    userId = user.id;
  } catch (error) {
    if (error instanceof ApiError) {
      return fail(error.status, error.body.message);
    }
    throw error;
  }

  const imageRecord = await db
    .select({
      id: listingImages.id,
      listingId: listingImages.listingId,
      ownerId: listings.userId
    })
    .from(listingImages)
    .innerJoin(listings, eq(listingImages.listingId, listings.id))
    .where(eq(listingImages.url, decodedUrl))
    .limit(1);

  const image = imageRecord[0];

  if (!image) {
    logger.warn(
      { decodedUrl, userId },
      "Requested image URL not found in database"
    );
    return fail(404, "Image not found");
  }

  if (image.ownerId !== userId) {
    logger.warn(
      { decodedUrl, userId, listingOwner: image.ownerId },
      "User attempted to access unauthorized image"
    );
    return fail(403, "You do not have access to this image");
  }

  const signedResult = await storageService.getSignedDownloadUrl(
    decodedUrl,
    SIGNED_URL_TTL_SECONDS
  );

  if (!signedResult.success) {
    logger.error(
      { decodedUrl, error: signedResult.error },
      "Could not sign image URL"
    );
    return fail(502, signedResult.error || "Unable to sign image URL");
  }

  const upstreamResponse = await fetch(signedResult.url, { cache: "no-store" });

  if (!upstreamResponse.ok) {
    logger.error(
      {
        decodedUrl,
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText
      },
      "Signed image fetch failed"
    );
    return fail(upstreamResponse.status, "Failed to fetch signed image");
  }

  if (!upstreamResponse.body) {
    logger.error({ decodedUrl }, "Upstream response has no body");
    return fail(502, "Upstream response has no body");
  }

  const headers = new Headers();
  const contentType = upstreamResponse.headers.get("content-type");

  if (contentType && !contentType.startsWith("image/")) {
    logger.error(
      { decodedUrl, contentType },
      "Upstream response is not an image"
    );
    return fail(502, "Upstream resource is not a valid image");
  }

  if (contentType) {
    headers.set("content-type", contentType);
  }

  // Convert stream to buffer to ensure body can be consumed by Next.js Image Optimization
  const arrayBuffer = await upstreamResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  headers.set(
    "cache-control",
    `public, max-age=${CLIENT_CACHE_MAX_AGE}, s-maxage=${EDGE_CACHE_MAX_AGE}, immutable`
  );
  headers.set("content-length", buffer.length.toString());

  return new NextResponse(buffer, {
    status: 200,
    headers
  });
}
