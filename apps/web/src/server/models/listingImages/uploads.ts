"use server";

import { db, eq, listingImages } from "@db/client";
import { MAX_IMAGE_BYTES } from "@shared/utils/mediaUpload";
import { getListingImagePath } from "@shared/utils/storagePaths";
import storageService from "@web/src/server/services/storage";
import { withDbErrorHandling } from "@web/src/server/models/shared/dbErrorHandling";
import {
  buildUploadFailure,
  isImageMimeType,
  toMegabytes
} from "@web/src/server/models/shared/uploadValidation";
import { ensureListingImageAccess } from "./helpers";
import type {
  ListingImageUploadRequest,
  ListingImageUploadUrlResult
} from "./types";

const MAX_LISTING_IMAGE_COUNT = 20;

export async function getListingImageUploadUrls(
  userId: string,
  listingId: string,
  files: ListingImageUploadRequest[]
): Promise<ListingImageUploadUrlResult> {
  if (!files || files.length === 0) {
    throw new Error("No files provided for upload");
  }

  return withDbErrorHandling(
    async () => {
      await ensureListingImageAccess(userId, listingId, {
        userIdError: "User ID is required to upload listing images",
        listingIdError: "Listing ID is required to upload listing images"
      });

      const existingImages = await db
        .select({ id: listingImages.id })
        .from(listingImages)
        .where(eq(listingImages.listingId, listingId));

      const uploads = [] as ListingImageUploadUrlResult["uploads"];
      const failed = [] as ListingImageUploadUrlResult["failed"];
      const maxImageMb = toMegabytes(MAX_IMAGE_BYTES);

      if (existingImages.length + files.length > MAX_LISTING_IMAGE_COUNT) {
        throw new Error("Listings can contain up to 20 photos.");
      }

      for (const file of files) {
        if (!isImageMimeType(file.fileType)) {
          failed.push(
            buildUploadFailure(file.id, file.fileName, "Only image files are supported.")
          );
          continue;
        }

        if (file.fileSize > MAX_IMAGE_BYTES) {
          failed.push(
            buildUploadFailure(
              file.id,
              file.fileName,
              `Images must be ${maxImageMb} MB or smaller.`
            )
          );
          continue;
        }

        const key = getListingImagePath(userId, listingId, file.fileName);
        const signed = await storageService.getSignedUploadUrl(key, file.fileType);

        if (!signed.success) {
          failed.push(buildUploadFailure(file.id, file.fileName, signed.error));
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
