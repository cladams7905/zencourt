"use server";

import {
  content,
  db,
  desc,
  eq,
  inArray,
  listingImages,
  listings,
  sql
} from "@db/client";
import type { DBContent, DBListing } from "@shared/types/models";
import { withDbErrorHandling } from "@web/src/server/actions/shared/dbErrorHandling";
import { requireUserId } from "@web/src/server/actions/shared/validation";
import { signUrlArray } from "@web/src/server/actions/shared/urlSigning";
import {
  resolveSignedDownloadUrl,
  DEFAULT_THUMBNAIL_TTL_SECONDS
} from "@web/src/server/utils/storageUrls";
import { withSignedContentThumbnails } from "./helpers";
import type { ListingSummaryPreview } from "./types";

type ListingWithContentRow = {
  listing: typeof listings.$inferSelect;
  content: typeof content.$inferSelect | null;
};

function buildListingSummariesQuery(userId: string) {
  return db
    .select({
      id: listings.id,
      title: listings.title,
      listingStage: listings.listingStage,
      lastOpenedAt: listings.lastOpenedAt,
      createdAt: listings.createdAt,
      imageCount: sql<number>`count(${listingImages.id})`.mapWith(Number)
    })
    .from(listings)
    .leftJoin(listingImages, eq(listingImages.listingId, listings.id))
    .where(eq(listings.userId, userId))
    .groupBy(listings.id)
    .orderBy(
      desc(sql`coalesce(${listings.lastOpenedAt}, ${listings.createdAt})`)
    );
}

function normalizeImageCount(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function getLatestContent(contents: DBContent[]): DBContent | null {
  return contents.reduce<DBContent | null>((latest, current) => {
    if (!latest) {
      return current;
    }
    const latestTime = latest.updatedAt
      ? new Date(latest.updatedAt).getTime()
      : 0;
    const currentTime = current.updatedAt
      ? new Date(current.updatedAt).getTime()
      : 0;
    return currentTime > latestTime ? current : latest;
  }, null);
}

function groupListingRows(rows: ListingWithContentRow[]) {
  const listingMap = new Map<
    string,
    {
      listing: typeof listings.$inferSelect;
      contents: DBContent[];
    }
  >();

  for (const { listing, content: contentRow } of rows) {
    let entry = listingMap.get(listing.id);
    if (!entry) {
      entry = { listing, contents: [] };
      listingMap.set(listing.id, entry);
    }

    if (!contentRow) {
      continue;
    }

    const alreadyExists = entry.contents.some(
      (existing) => existing.id === contentRow.id
    );
    if (!alreadyExists) {
      entry.contents.push(contentRow);
    }
  }

  return Array.from(listingMap.values()).map(({ listing, contents }) => {
    const primaryContent = getLatestContent(contents);
    return {
      ...listing,
      primaryContentId: primaryContent?.id ?? null,
      thumbnailUrl: primaryContent?.thumbnailUrl ?? null,
      contents
    };
  });
}

async function signListings(
  listingsWithContent: DBListing[]
): Promise<DBListing[]> {
  return Promise.all(
    listingsWithContent.map(async (listing) => {
      const signedContent = await withSignedContentThumbnails(
        listing.contents ?? []
      );
      return {
        ...listing,
        contents: signedContent,
        thumbnailUrl: await resolveSignedDownloadUrl(
          listing.thumbnailUrl,
          DEFAULT_THUMBNAIL_TTL_SECONDS
        )
      };
    })
  );
}

export async function getUserListings(userId: string): Promise<DBListing[]> {
  requireUserId(userId, "User ID is required to fetch listings");

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
        .orderBy(
          desc(sql`coalesce(${listings.lastOpenedAt}, ${listings.createdAt})`)
        );

      const groupedListings = groupListingRows(rows);
      return signListings(groupedListings as DBListing[]);
    },
    {
      actionName: "getUserListings",
      errorMessage: "Failed to fetch listings. Please try again."
    }
  );
}

export async function getUserListingSummariesPage(
  userId: string,
  {
    limit = 10,
    offset = 0
  }: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ items: ListingSummaryPreview[]; hasMore: boolean }> {
  requireUserId(userId, "User ID is required to fetch listings");

  return withDbErrorHandling(
    async () => {
      const normalizedLimit = Math.max(1, Math.min(limit, 50));
      const normalizedOffset = Math.max(0, offset);

      const rows = await buildListingSummariesQuery(userId)
        .limit(normalizedLimit + 1)
        .offset(normalizedOffset);

      const hasMore = rows.length > normalizedLimit;
      const pageRows = rows.slice(0, normalizedLimit);
      const listingIds = pageRows.map((row) => row.id);
      const previewImagesMap = new Map<string, string[]>();

      if (listingIds.length > 0) {
        const images = await db
          .select({
            listingId: listingImages.listingId,
            url: listingImages.url,
            isPrimary: listingImages.isPrimary,
            uploadedAt: listingImages.uploadedAt
          })
          .from(listingImages)
          .where(inArray(listingImages.listingId, listingIds))
          .orderBy(
            desc(listingImages.isPrimary),
            desc(listingImages.uploadedAt)
          );

        for (const image of images) {
          const list = previewImagesMap.get(image.listingId) ?? [];
          if (list.length >= 3) {
            continue;
          }
          list.push(image.url);
          previewImagesMap.set(image.listingId, list);
        }
      }

      const signedPreviewImagesMap = new Map<string, string[]>();
      for (const [listingId, urls] of previewImagesMap.entries()) {
        const signedUrls = await signUrlArray(urls, resolveSignedDownloadUrl);
        signedPreviewImagesMap.set(listingId, signedUrls);
      }

      return {
        items: pageRows.map((row) => ({
          ...row,
          imageCount: normalizeImageCount(row.imageCount),
          previewImages: signedPreviewImagesMap.get(row.id) ?? []
        })),
        hasMore
      };
    },
    {
      actionName: "getUserListingSummariesPage",
      errorMessage: "Failed to fetch listings. Please try again."
    }
  );
}
