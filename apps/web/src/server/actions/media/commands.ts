"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { withCurrentUser } from "@web/src/server/actions/shared/auth";
import {
  countUserMediaVideos,
  createUserMediaRecords,
  deleteUserMedia,
  getUserMedia,
  getUserMediaById,
  getUserMediaVideoPage
} from "@web/src/server/models/user";
import { mapUserMediaToVideoItem } from "@web/src/server/actions/listings/content/reels/mappers";
import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";
import { deleteStorageUrlsOrThrow } from "@web/src/server/actions/shared/storageCleanup";
import {
  getPublicDownloadUrlSafe,
  isManagedStorageUrl
} from "@web/src/server/services/storage/urlResolution";
import {
  mapUserMediaRecordInputs,
  prepareUserMediaUploadUrls
} from "@web/src/server/services/storage/uploadPreparation";
import type {
  UserMediaRecordInput,
  UserMediaUploadRequest
} from "@web/src/server/models/user";

export const getUserMediaUploadUrlsForCurrentUser = withServerActionCaller(
  "getUserMediaUploadUrlsForCurrentUser",
  async (files: UserMediaUploadRequest[]) =>
    withCurrentUser(async ({ user }) =>
      prepareUserMediaUploadUrls(user.id, files)
    )
);

export const createUserMediaRecordsForCurrentUser = withServerActionCaller(
  "createUserMediaRecordsForCurrentUser",
  async (uploads: UserMediaRecordInput[]) =>
    withCurrentUser(async ({ user }) =>
      createUserMediaRecords(
        user.id,
        mapUserMediaRecordInputs(user.id, uploads)
      )
    )
);

export const deleteUserMediaForCurrentUser = withServerActionCaller(
  "deleteUserMediaForCurrentUser",
  async (mediaId: string) =>
    withCurrentUser(async ({ user }) => {
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
    })
);

export const getUserMediaForCurrentUser = withServerActionCaller(
  "getUserMediaForCurrentUser",
  async () =>
    withCurrentUser(async ({ user }) => {
      const userMedia = await getUserMedia(user.id);
      return userMedia.map((media) => ({
        ...media,
        url: getPublicDownloadUrlSafe(media.url) ?? media.url,
        thumbnailUrl:
          getPublicDownloadUrlSafe(media.thumbnailUrl) ?? media.thumbnailUrl
      }));
    })
);

const USER_MEDIA_REEL_PICKER_PAGE_SIZE = 6;

export type UserMediaReelPickerPage = {
  items: ContentItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

export const getUserMediaPageForReelPicker = withServerActionCaller(
  "getUserMediaPageForReelPicker",
  async (params: { limit?: number; cursor?: string | null }) =>
    withCurrentUser(async ({ user }) => {
      const limit = params.limit ?? USER_MEDIA_REEL_PICKER_PAGE_SIZE;
      const page = await getUserMediaVideoPage(user.id, {
        limit,
        cursor: params.cursor ?? null
      });
      const items = page.items
        .map((media) =>
          mapUserMediaToVideoItem({
            ...media,
            url: getPublicDownloadUrlSafe(media.url) ?? media.url,
            thumbnailUrl:
              getPublicDownloadUrlSafe(media.thumbnailUrl) ?? media.thumbnailUrl
          })
        )
        .filter((item): item is ContentItem => Boolean(item));
      return {
        items,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore
      } satisfies UserMediaReelPickerPage;
    })
);

export const getUserMediaVideoCountForCurrentUser = withServerActionCaller(
  "getUserMediaVideoCountForCurrentUser",
  async () =>
    withCurrentUser(async ({ user }) => countUserMediaVideos(user.id))
);
