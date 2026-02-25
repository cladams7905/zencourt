"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { requireAuthenticatedUser } from "@web/src/server/actions/_auth/api";
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

export const getUserMediaUploadUrlsForCurrentUser = withServerActionCaller(
  "getUserMediaUploadUrlsForCurrentUser",
  async (files: UserMediaUploadRequest[]) => {
    const user = await requireAuthenticatedUser();
    return prepareUserMediaUploadUrls(user.id, files);
  }
);

export const createUserMediaRecordsForCurrentUser = withServerActionCaller(
  "createUserMediaRecordsForCurrentUser",
  async (uploads: UserMediaRecordInput[]) => {
    const user = await requireAuthenticatedUser();
    return createUserMediaRecords(
      user.id,
      mapUserMediaRecordInputs(user.id, uploads)
    );
  }
);

export const deleteUserMediaForCurrentUser = withServerActionCaller(
  "deleteUserMediaForCurrentUser",
  async (mediaId: string) => {
    const user = await requireAuthenticatedUser();
    const media = await getUserMediaById(user.id, mediaId);
    await deleteUserMedia(user.id, mediaId);

    if (!media) {
      return;
    }

    await deleteStorageUrlsOrThrow(
      [media.url, media.thumbnailUrl].filter(
        (url): url is string =>
          typeof url === "string" && isManagedStorageUrl(url)
      ),
      "Failed to delete media file"
    );
  }
);
