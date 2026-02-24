"use server";

import { requireAuthenticatedUser } from "@web/src/server/utils/apiAuth";
import {
  createUserMediaRecords,
  deleteUserMedia,
  getUserMediaUploadUrls
} from "@web/src/server/models/userMedia";
import type {
  UserMediaRecordInput,
  UserMediaUploadRequest
} from "@web/src/server/models/userMedia/types";

export async function getUserMediaUploadUrlsForCurrentUser(
  files: UserMediaUploadRequest[]
) {
  const user = await requireAuthenticatedUser();
  return getUserMediaUploadUrls(user.id, files);
}

export async function createUserMediaRecordsForCurrentUser(
  uploads: UserMediaRecordInput[]
) {
  const user = await requireAuthenticatedUser();
  return createUserMediaRecords(user.id, uploads);
}

export async function deleteUserMediaForCurrentUser(mediaId: string) {
  const user = await requireAuthenticatedUser();
  return deleteUserMedia(user.id, mediaId);
}
