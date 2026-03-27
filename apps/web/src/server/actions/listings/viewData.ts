"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { requireAuthenticatedUser } from "@web/src/server/actions/_auth/api";
import { requireListingAccess } from "@web/src/server/models/listings/access";
import {
  getListingImages,
  mapListingImageToDisplayItem
} from "@web/src/server/models/listings/images";
import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";
import { getUserMedia } from "@web/src/server/models/user";
import { mapUserMediaToVideoItem } from "./content/reels";
import {
  LISTING_CREATE_INITIAL_PAGE_SIZE,
  type ListingCreateMediaTab
} from "@web/src/lib/domain/listings/create";
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
    listingContentItemsPage,
    userMediaRows
  ] = await Promise.all([
    getListingClipVersionItems(listingId),
    getListingImages(userId, listingId),
    getListingContentItems({
      userId,
      listingId,
      mediaTab: options?.initialMediaTab,
      subcategory: options?.initialSubcategory,
      limit: LISTING_CREATE_INITIAL_PAGE_SIZE,
      offset: 0
    }),
    getUserMedia(userId)
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
    listingImages: listingImages.map(mapListingImageToDisplayItem)
  };
}

export const getListingCreateViewDataForCurrentUser = withServerActionCaller(
  "getListingCreateViewDataForCurrentUser",
  async (listingId: string) => {
    const user = await requireAuthenticatedUser();
    await requireListingAccess(listingId, user.id);
    return getListingCreateViewData(user.id, listingId);
  }
);
