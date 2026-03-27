"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { withCurrentUserListingAccess } from "@web/src/server/actions/shared/auth";
import {
  getListingImages,
  mapListingImageToDisplayItem
} from "@web/src/server/models/listings/images";
import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";
import {
  countUserMediaVideos,
  getUserMediaByIds
} from "@web/src/server/models/user";
import { getContentByListingId } from "@web/src/server/models/content";
import { getAllCachedListingContentForCreate } from "@web/src/server/infra/cache/listingContent/cache";
import { mapUserMediaToVideoItem } from "./content/reels";
import { collectReelReferencedUserMediaIdsFromSnapshot } from "./content/reels/userMedia";
import {
  LISTING_CREATE_INITIAL_PAGE_SIZE,
  type ListingCreateMediaTab
} from "@web/src/lib/domain/listings/content/create";
import type { ListingContentSubcategory } from "@shared/types/models";
import { getListingContentItems } from "./content/items";
import { getListingClipVersionItems } from "./clips";

export async function getListingCreateViewData(
  userId: string,
  listingId: string,
  options?: {
    initialMediaTab?: ListingCreateMediaTab;
    initialSubcategory?: ListingContentSubcategory;
  }
) {
  const [
    clipVersionItems,
    listingImages,
    savedContentRows,
    cachedAllForCreate,
    userMediaVideoCount
  ] = await Promise.all([
    getListingClipVersionItems(listingId),
    getListingImages(userId, listingId),
    getContentByListingId(userId, listingId),
    getAllCachedListingContentForCreate({ userId, listingId }),
    countUserMediaVideos(userId)
  ]);

  const reelReferencedUserMediaIds =
    collectReelReferencedUserMediaIdsFromSnapshot(
      savedContentRows,
      cachedAllForCreate
    );

  const [listingContentItemsPage, userMediaRows] = await Promise.all([
    getListingContentItems({
      userId,
      listingId,
      mediaTab: options?.initialMediaTab,
      subcategory: options?.initialSubcategory,
      limit: LISTING_CREATE_INITIAL_PAGE_SIZE,
      offset: 0,
      savedContentRows
    }),
    getUserMediaByIds(userId, reelReferencedUserMediaIds)
  ]);

  const listingClipItems: ContentItem[] = clipVersionItems
    .map((clipItem) => clipItem.currentVersion)
    .filter((clipVersion) => clipVersion.videoUrl || clipVersion.thumbnail)
    .map((clipVersion) => ({
      ...clipVersion,
      reelClipSource: "listing_clip" as const
    }));

  const userMediaClipItems = userMediaRows
    .map(mapUserMediaToVideoItem)
    .filter((item): item is ContentItem => Boolean(item));

  return {
    listingClipItems: [...listingClipItems, ...userMediaClipItems],
    clipVersionItems,
    listingContentItems: listingContentItemsPage.items,
    listingImages: listingImages.map(mapListingImageToDisplayItem),
    userMediaVideoCount
  };
}

export const getListingCreateViewDataForCurrentUser = withServerActionCaller(
  "getListingCreateViewDataForCurrentUser",
  async (listingId: string) =>
    withCurrentUserListingAccess(listingId, async ({ user }) =>
      getListingCreateViewData(user.id, listingId)
    )
);
