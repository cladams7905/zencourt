"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import {
  withCurrentUser,
  withCurrentUserListingAccess
} from "@web/src/server/actions/shared/auth";
import {
  assignPrimaryListingImageForCategory,
  createListingImageRecords,
  getListingImages,
  updateListingImageAssignments,
  getListingImageUrlsByIds
} from "@web/src/server/models/listings/images";
import { deleteStorageUrlsOrThrow } from "@web/src/server/actions/shared/storageCleanup";
import { isManagedStorageUrl } from "@web/src/server/services/storage/urlResolution";
import type {
  ListingImageRecordInput,
  ListingImageUpdate,
  ListingImageUploadRequest
} from "@web/src/server/models/listings/images/types";
import { prepareListingImageUploadUrls } from "@web/src/server/services/storage/uploadPreparation";

export const getListingImageUploadUrlsForCurrentUser = withServerActionCaller(
  "getListingImageUploadUrlsForCurrentUser",
  async (listingId: string, files: ListingImageUploadRequest[]) =>
    withCurrentUserListingAccess(listingId, async ({ user }) => {
      const existingImages = await getListingImages(user.id, listingId);
      return prepareListingImageUploadUrls(
        user.id,
        listingId,
        files,
        existingImages.length
      );
    })
);

export const createListingImageRecordsForCurrentUser = withServerActionCaller(
  "createListingImageRecordsForCurrentUser",
  async (listingId: string, uploads: ListingImageRecordInput[]) =>
    withCurrentUser(async ({ user }) =>
      createListingImageRecords(user.id, listingId, uploads)
    )
);

export const updateListingImageAssignmentsForCurrentUser =
  withServerActionCaller(
    "updateListingImageAssignmentsForCurrentUser",
    async (
      listingId: string,
      updates: ListingImageUpdate[],
      deletions: string[]
    ) =>
      withCurrentUser(async ({ user }) => {
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
      })
  );

export const deleteListingImageUploadsForCurrentUser = withServerActionCaller(
  "deleteListingImageUploadsForCurrentUser",
  async (listingId: string, urls: string[]) =>
    withCurrentUserListingAccess(listingId, async () => {
      await deleteStorageUrlsOrThrow(
        urls.filter((url) => isManagedStorageUrl(url)),
        "Failed to clean up listing uploads."
      );
    })
);

export const assignPrimaryListingImageForCategoryForCurrentUser =
  withServerActionCaller(
    "assignPrimaryListingImageForCategoryForCurrentUser",
    async (listingId: string, category: string) =>
      withCurrentUser(async ({ user }) =>
        assignPrimaryListingImageForCategory(user.id, listingId, category)
      )
  );

export const getListingImagesForCurrentUser = withServerActionCaller(
  "getListingImagesForCurrentUser",
  async (listingId: string) =>
    withCurrentUser(async ({ user }) => getListingImages(user.id, listingId))
);
