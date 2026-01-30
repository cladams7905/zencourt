"use server";

import { nanoid } from "nanoid";
import {
  db,
  listings,
  content,
  listingImages,
  eq,
  and,
  inArray,
  ne,
  like,
  desc
} from "@db/client";
import {
  DBContent,
  DBListing,
  DBListingImage,
  ImageMetadata,
  InsertDBListing,
  InsertDBListingImage
} from "@shared/types/models";
import { withDbErrorHandling } from "../_utils";
import {
  DEFAULT_THUMBNAIL_TTL_SECONDS,
  resolveSignedDownloadUrl
} from "../../utils/storageUrls";
import { MAX_IMAGE_BYTES } from "@shared/utils/mediaUpload";
import {
  getListingFolder,
  getListingImagePath
} from "@shared/utils/storagePaths";
import storageService from "../../services/storageService";
import { isManagedStorageUrl } from "../../utils/storageUrls";

type ListingImageUploadRequest = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

type ListingImageSignedUpload = {
  id: string;
  fileName: string;
  key: string;
  uploadUrl: string;
  publicUrl: string;
};

type ListingImageUploadUrlResult = {
  uploads: ListingImageSignedUpload[];
  failed: Array<{ id: string; fileName: string; error: string }>;
};

type ListingImageRecordInput = {
  key: string;
  fileName: string;
  publicUrl: string;
  metadata?: ImageMetadata;
};

type ListingImageUpdate = {
  id: string;
  category: string | null;
  isPrimary?: boolean | null;
};

async function assertListingOwnership(
  userId: string,
  listingId: string
): Promise<DBListing> {
  const [listing] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.userId, userId)))
    .limit(1);

  if (!listing) {
    throw new Error("Listing not found");
  }

  return listing as DBListing;
}

async function withSignedContentThumbnails(
  contentList: DBContent[]
): Promise<DBContent[]> {
  if (!contentList || contentList.length === 0) {
    return contentList;
  }
  return Promise.all(
    contentList.map(async (item) => ({
      ...item,
      thumbnailUrl: await resolveSignedDownloadUrl(
        item.thumbnailUrl,
        DEFAULT_THUMBNAIL_TTL_SECONDS
      )
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

export async function createDraftListing(userId: string): Promise<DBListing> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to create a draft listing");
  }

  return withDbErrorHandling(
    async () => {
      const listing = await createListing(userId);
      const draftNumber = await getNextDraftNumber(userId);
      const title = `Draft ${draftNumber}`;
      await updateListing(userId, listing.id, { title });

      const confirmed = await getListingById(userId, listing.id);
      if (!confirmed) {
        throw new Error("Draft listing could not be saved.");
      }

      return {
        ...confirmed,
        title
      };
    },
    {
      actionName: "createDraftListing",
      context: { userId },
      errorMessage: "Failed to create draft listing. Please try again."
    }
  );
}

export async function getListingById(
  userId: string,
  listingId: string
): Promise<DBListing | null> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch a listing");
  }
  if (!listingId || listingId.trim() === "") {
    throw new Error("Listing ID is required to fetch a listing");
  }

  return withDbErrorHandling(
    async () => {
      const [listing] = await db
        .select()
        .from(listings)
        .where(and(eq(listings.id, listingId), eq(listings.userId, userId)))
        .limit(1);

      return (listing as DBListing) ?? null;
    },
    {
      actionName: "getListingById",
      context: { userId, listingId },
      errorMessage: "Failed to fetch listing. Please try again."
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
export async function getUserListings(userId: string): Promise<DBListing[]> {
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
          listing: typeof listings.$inferSelect;
          contents: DBContent[];
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
          const primaryContent = contents.reduce<DBContent | null>(
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
            thumbnailUrl: await resolveSignedDownloadUrl(
              listing.thumbnailUrl,
              DEFAULT_THUMBNAIL_TTL_SECONDS
            )
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

export async function getListingImages(
  userId: string,
  listingId: string
): Promise<DBListingImage[]> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch listing images");
  }
  if (!listingId || listingId.trim() === "") {
    throw new Error("Listing ID is required to fetch listing images");
  }

  return withDbErrorHandling(
    async () => {
      await assertListingOwnership(userId, listingId);

      const images = await db
        .select()
        .from(listingImages)
        .where(eq(listingImages.listingId, listingId))
        .orderBy(desc(listingImages.uploadedAt));

      return Promise.all(
        images.map(async (image) => ({
          ...image,
          url:
            (await resolveSignedDownloadUrl(
              image.url,
              DEFAULT_THUMBNAIL_TTL_SECONDS
            )) ?? image.url
        }))
      );
    },
    {
      actionName: "getListingImages",
      context: { userId, listingId },
      errorMessage: "Failed to fetch listing images. Please try again."
    }
  );
}

export async function getListingImageUploadUrls(
  userId: string,
  listingId: string,
  files: ListingImageUploadRequest[]
): Promise<ListingImageUploadUrlResult> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to upload listing images");
  }
  if (!listingId || listingId.trim() === "") {
    throw new Error("Listing ID is required to upload listing images");
  }
  if (!files || files.length === 0) {
    throw new Error("No files provided for upload");
  }

  return withDbErrorHandling(
    async () => {
      await assertListingOwnership(userId, listingId);

      const existingImages = await db
        .select({ id: listingImages.id })
        .from(listingImages)
        .where(eq(listingImages.listingId, listingId));

      const uploads: ListingImageSignedUpload[] = [];
      const failed: Array<{ id: string; fileName: string; error: string }> = [];
      const maxImageMb = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));

      if (existingImages.length + files.length > 20) {
        throw new Error("Listings can contain up to 20 photos.");
      }

      for (const file of files) {
        if (!file.fileType.startsWith("image/")) {
          failed.push({
            id: file.id,
            fileName: file.fileName,
            error: "Only image files are supported."
          });
          continue;
        }

        if (file.fileSize > MAX_IMAGE_BYTES) {
          failed.push({
            id: file.id,
            fileName: file.fileName,
            error: `Images must be ${maxImageMb} MB or smaller.`
          });
          continue;
        }

        const key = getListingImagePath(userId, listingId, file.fileName);
        const signed = await storageService.getSignedUploadUrl(
          key,
          file.fileType
        );

        if (!signed.success) {
          failed.push({
            id: file.id,
            fileName: file.fileName,
            error: signed.error
          });
          continue;
        }

        uploads.push({
          id: file.id,
          fileName: file.fileName,
          key,
          uploadUrl: signed.url,
          publicUrl: storageService.buildPublicUrlForKey(key)
        });
      }

      return { uploads, failed };
    },
    {
      actionName: "getListingImageUploadUrls",
      context: { userId, listingId, fileCount: files.length },
      errorMessage: "Failed to prepare listing image uploads. Please try again."
    }
  );
}

export async function updateListingImageAssignments(
  userId: string,
  listingId: string,
  updates: ListingImageUpdate[],
  deletions: string[]
): Promise<{ updated: number; deleted: number }> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to update listing images");
  }
  if (!listingId || listingId.trim() === "") {
    throw new Error("Listing ID is required to update listing images");
  }

  return withDbErrorHandling(
    async () => {
      await assertListingOwnership(userId, listingId);

      if (deletions.length > 0) {
        const rowsToDelete = await db
          .select({ id: listingImages.id, url: listingImages.url })
          .from(listingImages)
          .where(
            and(
              eq(listingImages.listingId, listingId),
              inArray(listingImages.id, deletions)
            )
          );

        for (const row of rowsToDelete) {
          if (row.url && isManagedStorageUrl(row.url)) {
            const deleteResult = await storageService.deleteFile(row.url);
            if (!deleteResult.success) {
              throw new Error(deleteResult.error);
            }
          }
        }

        await db
          .delete(listingImages)
          .where(
            and(
              eq(listingImages.listingId, listingId),
              inArray(listingImages.id, deletions)
            )
          );
      }

      for (const update of updates) {
        const nextIsPrimary =
          update.category === null ? false : update.isPrimary;
        if (nextIsPrimary && update.category) {
          await db
            .update(listingImages)
            .set({ isPrimary: false })
            .where(
              and(
                eq(listingImages.listingId, listingId),
                eq(listingImages.category, update.category),
                ne(listingImages.id, update.id)
              )
            );
        }
        await db
          .update(listingImages)
          .set({
            category: update.category,
            ...(update.isPrimary !== undefined
              ? { isPrimary: nextIsPrimary ?? false }
              : {})
          })
          .where(
            and(
              eq(listingImages.listingId, listingId),
              eq(listingImages.id, update.id)
            )
          );
      }

      return { updated: updates.length, deleted: deletions.length };
    },
    {
      actionName: "updateListingImageAssignments",
      context: { userId, listingId },
      errorMessage: "Failed to update listing images. Please try again."
    }
  );
}

export async function createListingImageRecords(
  userId: string,
  listingId: string,
  uploads: ListingImageRecordInput[]
): Promise<DBListingImage[]> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to save listing images");
  }
  if (!listingId || listingId.trim() === "") {
    throw new Error("Listing ID is required to save listing images");
  }
  if (!uploads || uploads.length === 0) {
    return [];
  }

  return withDbErrorHandling(
    async () => {
      await assertListingOwnership(userId, listingId);

      const prefix = `${getListingFolder(listingId, userId)}/images/`;
      const rows: InsertDBListingImage[] = uploads.map((upload, index) => {
        if (!upload.key.startsWith(prefix)) {
          throw new Error("Invalid listing image upload key");
        }

        return {
          id: nanoid(),
          listingId,
          filename: upload.fileName,
          url: upload.publicUrl,
          isPrimary: false,
          metadata: upload.metadata ?? null
        };
      });

      const inserted = await db.insert(listingImages).values(rows).returning();
      return inserted as DBListingImage[];
    },
    {
      actionName: "createListingImageRecords",
      context: { userId, listingId, uploadCount: uploads.length },
      errorMessage: "Failed to save listing images. Please try again."
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
        .where(
          and(eq(listings.userId, userId), like(listings.title, "Draft %"))
        );

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
