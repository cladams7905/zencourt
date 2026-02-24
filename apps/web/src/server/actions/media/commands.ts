"use server";

import { requireAuthenticatedUser } from "@web/src/server/auth/apiAuth";
import {
  createUserMediaRecords,
  deleteUserMedia,
  getUserMediaById
} from "@web/src/server/models/userMedia";
import { deleteStorageUrlsOrThrow } from "@web/src/server/actions/shared/storageCleanup";
import { isManagedStorageUrl } from "@web/src/server/services/storage/urlResolution";
import {
  mapUserMediaRecordInputs,
  prepareUserMediaUploadUrls
} from "@web/src/server/services/storage/uploadPreparation";
import type {
  UserMediaRecordInput,
  UserMediaUploadRequest
} from "@web/src/server/models/userMedia/types";

export async function getUserMediaUploadUrlsForCurrentUser(
  files: UserMediaUploadRequest[]
) {
  const user = await requireAuthenticatedUser();
  return prepareUserMediaUploadUrls(user.id, files);
}

export async function createUserMediaRecordsForCurrentUser(
  uploads: UserMediaRecordInput[]
) {
  const user = await requireAuthenticatedUser();
  return createUserMediaRecords(user.id, mapUserMediaRecordInputs(user.id, uploads));
}

export async function deleteUserMediaForCurrentUser(mediaId: string) {
  const user = await requireAuthenticatedUser();
  const media = await getUserMediaById(user.id, mediaId);
  await deleteUserMedia(user.id, mediaId);

  if (!media) {
    return;
  }

  await deleteStorageUrlsOrThrow(
    [media.url, media.thumbnailUrl].filter(
      (url): url is string => typeof url === "string" && isManagedStorageUrl(url)
    ),
    "Failed to delete media file"
  );
}
