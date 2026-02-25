"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { requireAuthenticatedUser } from "@web/src/server/actions/_auth/api";
import { createListing, updateListing } from "@web/src/server/models/listings";
import { requireListingAccess } from "@web/src/server/models/listings/access";
import type { UpdateListingInput } from "@web/src/server/models/listings/types";
import {
  assignPrimaryListingImageForCategory,
  createListingImageRecords,
  getListingImages,
  updateListingImageAssignments,
  getListingImageUrlsByIds
} from "@web/src/server/models/listingImages";
import { deleteStorageUrlsOrThrow } from "@web/src/server/actions/shared/storageCleanup";
import { isManagedStorageUrl } from "@web/src/server/services/storage/urlResolution";
import type {
  ListingImageRecordInput,
  ListingImageUpdate,
  ListingImageUploadRequest
} from "@web/src/server/models/listingImages/types";
import { prepareListingImageUploadUrls } from "@web/src/server/services/storage/uploadPreparation";

export const createListingForCurrentUser = withServerActionCaller(
  "serverAction:createListingForCurrentUser",
  async () => {
    const user = await requireAuthenticatedUser();
    return createListing(user.id);
  }
);

export const updateListingForCurrentUser = withServerActionCaller(
  "serverAction:updateListingForCurrentUser",
  async (listingId: string, updates: UpdateListingInput) => {
    const user = await requireAuthenticatedUser();
    return updateListing(user.id, listingId, updates);
  }
);

export async function getListingImageUploadUrlsForCurrentUser(
  listingId: string,
  files: ListingImageUploadRequest[]
) {
  const user = await requireAuthenticatedUser();
  await requireListingAccess(listingId, user.id);
  const existingImages = await getListingImages(user.id, listingId);
  return prepareListingImageUploadUrls(
    user.id,
    listingId,
    files,
    existingImages.length
  );
}

export const createListingImageRecordsForCurrentUser = withServerActionCaller(
  "serverAction:createListingImageRecordsForCurrentUser",
  async (listingId: string, uploads: ListingImageRecordInput[]) => {
    const user = await requireAuthenticatedUser();
    return createListingImageRecords(user.id, listingId, uploads);
  }
);

export async function updateListingImageAssignmentsForCurrentUser(
  listingId: string,
  updates: ListingImageUpdate[],
  deletions: string[]
) {
  const user = await requireAuthenticatedUser();
  const deletionUrls =
    deletions.length > 0
      ? await getListingImageUrlsByIds(user.id, listingId, deletions)
      : [];
  const result = await updateListingImageAssignments(
    user.id,
    listingId,
    updates,
    deletions
  );

  if (deletionUrls.length > 0) {
    await deleteStorageUrlsOrThrow(
      deletionUrls.filter((url) => isManagedStorageUrl(url)),
      "Failed to delete listing image"
    );
  }

  return result;
}

export const assignPrimaryListingImageForCategoryForCurrentUser =
  withServerActionCaller(
    "serverAction:assignPrimaryListingImageForCategoryForCurrentUser",
    async (listingId: string, category: string) => {
      const user = await requireAuthenticatedUser();
      return assignPrimaryListingImageForCategory(user.id, listingId, category);
    }
  );

export async function deleteListingImageUploadsForCurrentUser(
  listingId: string,
  urls: string[]
) {
  const user = await requireAuthenticatedUser();
  await requireListingAccess(listingId, user.id);
  await deleteStorageUrlsOrThrow(
    urls.filter((url) => isManagedStorageUrl(url)),
    "Failed to clean up listing uploads."
  );
}

export const getListingImagesForCurrentUser = withServerActionCaller(
  "serverAction:getListingImagesForCurrentUser",
  async (listingId: string) => {
    const user = await requireAuthenticatedUser();
    return getListingImages(user.id, listingId);
  }
);
