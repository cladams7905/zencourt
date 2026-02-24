"use server";

import { requireAuthenticatedUser } from "@web/src/server/utils/apiAuth";
import { createListing, updateListing } from "@web/src/server/models/listings";
import type { UpdateListingInput } from "@web/src/server/models/listings/types";
import {
  assignPrimaryListingImageForCategory,
  createListingImageRecords,
  deleteListingImageUploads,
  getListingImageUploadUrls,
  updateListingImageAssignments,
  getListingImages
} from "@web/src/server/models/listingImages";
import type {
  ListingImageRecordInput,
  ListingImageUpdate,
  ListingImageUploadRequest
} from "@web/src/server/models/listingImages/types";

export async function createListingForCurrentUser() {
  const user = await requireAuthenticatedUser();
  return createListing(user.id);
}

export async function updateListingForCurrentUser(
  listingId: string,
  updates: UpdateListingInput
) {
  const user = await requireAuthenticatedUser();
  return updateListing(user.id, listingId, updates);
}

export async function getListingImageUploadUrlsForCurrentUser(
  listingId: string,
  files: ListingImageUploadRequest[]
) {
  const user = await requireAuthenticatedUser();
  return getListingImageUploadUrls(user.id, listingId, files);
}

export async function createListingImageRecordsForCurrentUser(
  listingId: string,
  uploads: ListingImageRecordInput[]
) {
  const user = await requireAuthenticatedUser();
  return createListingImageRecords(user.id, listingId, uploads);
}

export async function updateListingImageAssignmentsForCurrentUser(
  listingId: string,
  updates: ListingImageUpdate[],
  deletions: string[]
) {
  const user = await requireAuthenticatedUser();
  return updateListingImageAssignments(user.id, listingId, updates, deletions);
}

export async function assignPrimaryListingImageForCategoryForCurrentUser(
  listingId: string,
  category: string
) {
  const user = await requireAuthenticatedUser();
  return assignPrimaryListingImageForCategory(user.id, listingId, category);
}

export async function deleteListingImageUploadsForCurrentUser(
  listingId: string,
  urls: string[]
) {
  const user = await requireAuthenticatedUser();
  return deleteListingImageUploads(user.id, listingId, urls);
}

export async function getListingImagesForCurrentUser(listingId: string) {
  const user = await requireAuthenticatedUser();
  return getListingImages(user.id, listingId);
}
