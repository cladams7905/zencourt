"use server";

import { nanoid } from "nanoid";
import { eq, and, like, desc } from "drizzle-orm";
import { db, listings, content } from "@db/client";
import { DBListing, InsertDBListing } from "@shared/types/models";
import { withDbErrorHandling } from "../_utils";
import { getSignedDownloadUrlSafe } from "../../utils/storageUrls";

type ContentRecord = typeof content.$inferSelect;

const LISTING_THUMBNAIL_TTL_SECONDS = 6 * 60 * 60; // 6 hours

async function resolveThumbnailUrl(
  url?: string | null
): Promise<string | null> {
  if (!url) {
    return url ?? null;
  }
  const signed = await getSignedDownloadUrlSafe(
    url,
    LISTING_THUMBNAIL_TTL_SECONDS
  );
  return signed ?? url ?? null;
}

async function withSignedContentThumbnails(
  contentList: ContentRecord[]
): Promise<ContentRecord[]> {
  if (!contentList || contentList.length === 0) {
    return contentList;
  }
  return Promise.all(
    contentList.map(async (item) => ({
      ...item,
      thumbnailUrl: await resolveThumbnailUrl(item.thumbnailUrl)
    }))
  );
}

/**
 * Create a new listing
 * Server action that creates a listing in the database
 *
 * @returns Promise<DBListing> - The created listing
 * @throws Error if user is not authenticated or listing creation fails
 */
export async function createListing(userId: string): Promise<DBListing> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to create a listing");
  }

  return withDbErrorHandling(
    async () => {
      return db.transaction(async (tx) => {
        const listingId = nanoid();
        const [newListing] = await tx
          .insert(listings)
          .values({
            id: listingId,
            userId
          })
          .returning();

        const [primaryContent] = await tx
          .insert(content)
          .values({
            id: nanoid(),
            listingId,
            userId,
            contentType: "video",
            status: "draft"
          })
          .returning();

        return {
          ...newListing,
          primaryContentId: primaryContent.id,
          thumbnailUrl: primaryContent.thumbnailUrl,
          contents: [primaryContent]
        };
      });
    },
    {
      actionName: "createListing",
      errorMessage: "Failed to create listing. Please try again."
    }
  );
}

/**
 * Update listing
 * Server action that updates one or more fields of a listing
 *
 * @param listingId - The ID of the listing to update
 * @param updates - Partial listing object with fields to update
 * @returns Promise<DBListing> - The updated listing
 * @throws Error if user is not authenticated or update fails
 */
export async function updateListing(
  userId: string,
  listingId: string,
  updates: Partial<Omit<InsertDBListing, "id" | "userId" | "createdAt">>
): Promise<DBListing> {
  if (!listingId || listingId.trim() === "") {
    throw new Error("Listing ID is required");
  }
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to update a listing");
  }

  return withDbErrorHandling(
    async () => {
      const [updatedListing] = await db
        .update(listings)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(and(eq(listings.id, listingId), eq(listings.userId, userId)))
        .returning();

      if (!updatedListing) {
        throw new Error("Listing not found");
      }

      return updatedListing;
    },
    {
      actionName: "updateListing",
      context: { listingId },
      errorMessage: "Failed to update listing. Please try again."
    }
  );
}

/**
 * Get all listings for the current user
 * Server action that retrieves all listings belonging to the authenticated user
 *
 * @returns Promise<DBListing[]> - Array of user's listings
 * @throws Error if user is not authenticated
 */
export async function getUserListings(
  userId: string
): Promise<DBListing[]> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch listings");
  }

  return withDbErrorHandling(
    async () => {
      const rows = await db
        .select({
          listing: listings,
          content: content
        })
        .from(listings)
        .leftJoin(content, eq(content.listingId, listings.id))
        .where(eq(listings.userId, userId))
        .orderBy(desc(listings.createdAt));

      const listingMap = new Map<
        string,
        {
          listing: (typeof listings.$inferSelect);
          contents: ContentRecord[];
        }
      >();

      for (const { listing, content: contentRow } of rows) {
        let entry = listingMap.get(listing.id);
        if (!entry) {
          entry = {
            listing,
            contents: []
          };
          listingMap.set(listing.id, entry);
        }

        if (contentRow) {
          const alreadyExists = entry.contents.some(
            (existing) => existing.id === contentRow.id
          );
          if (!alreadyExists) {
            entry.contents.push(contentRow);
          }
        }
      }

      const aggregatedListings = Array.from(listingMap.values()).map(
        ({ listing, contents }) => {
          const primaryContent = contents.reduce<ContentRecord | null>(
            (latest, current) => {
              if (!latest) return current;
              const latestTime = latest.updatedAt
                ? new Date(latest.updatedAt).getTime()
                : 0;
              const currentTime = current.updatedAt
                ? new Date(current.updatedAt).getTime()
                : 0;
              return currentTime > latestTime ? current : latest;
            },
            null
          );

          return {
            ...listing,
            primaryContentId: primaryContent?.id ?? null,
            thumbnailUrl: primaryContent?.thumbnailUrl ?? null,
            contents
          };
        }
      );

      return Promise.all(
        aggregatedListings.map(async (listing) => {
          const signedContent = await withSignedContentThumbnails(
            listing.contents ?? []
          );
          return {
            ...listing,
            contents: signedContent,
            thumbnailUrl: await resolveThumbnailUrl(listing.thumbnailUrl)
          };
        })
      );
    },
    {
      actionName: "getUserListings",
      errorMessage: "Failed to fetch listings. Please try again."
    }
  );
}

/**
 * Get the next draft number for the user
 * Counts existing draft listings and returns the next sequential number
 *
 * @returns Promise<number> - The next draft number
 * @throws Error if user is not authenticated
 */
export async function getNextDraftNumber(userId: string): Promise<number> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch draft numbers");
  }

  return withDbErrorHandling(
    async () => {
      // Get all listings with titles starting with "Draft "
      const draftListings = await db
        .select()
        .from(listings)
        .where(and(eq(listings.userId, userId), like(listings.title, "Draft %")));

      // Extract draft numbers and find the highest
      const draftNumbers = draftListings
        .map((p) => {
          const match = p.title?.match(/^Draft (\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((num) => !isNaN(num));

      const maxDraftNumber =
        draftNumbers.length > 0 ? Math.max(...draftNumbers) : 0;

      return maxDraftNumber + 1;
    },
    {
      actionName: "getNextDraftNumber",
      errorMessage: "Failed to get draft number. Please try again."
    }
  );
}
