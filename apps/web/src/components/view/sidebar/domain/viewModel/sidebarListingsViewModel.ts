import type { ListingSidebarItem } from "@web/src/components/view/sidebar/shared";

export type SidebarListingDisplayItem = Omit<ListingSidebarItem, "title"> & {
  title: string;
};

const normalizeListingTitle = (title?: string | null) =>
  title?.trim() || "Untitled listing";

const parseListingLastOpenedAt = (value?: string | Date | null) => {
  if (!value) {
    return 0;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export const sortSidebarListings = (
  listings: ListingSidebarItem[]
): SidebarListingDisplayItem[] =>
  [...listings]
    .map((listing) => ({
      ...listing,
      title: normalizeListingTitle(listing.title)
    }))
    .sort(
      (a, b) =>
        parseListingLastOpenedAt(b.lastOpenedAt) -
        parseListingLastOpenedAt(a.lastOpenedAt)
    );

export const buildSidebarListingsViewModel = (
  listings: ListingSidebarItem[]
): {
  listingItems: SidebarListingDisplayItem[];
  displayedListingItems: SidebarListingDisplayItem[];
  hasMoreListings: boolean;
} => {
  const listingItems = sortSidebarListings(listings);
  const displayedListingItems = listingItems.slice(0, 3);

  return {
    listingItems,
    displayedListingItems,
    hasMoreListings: listingItems.length > 3
  };
};
