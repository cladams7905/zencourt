/**
 * Vertical clearance for the listing content filter bar (`sticky top`) below the
 * listing header. Add {@link LISTING_CONTENT_FILTER_EXTRA_TOP_BANNER_PX} when a
 * global banner sits above the header.
 */
export const LISTING_CONTENT_FILTER_BASE_STICKY_TOP_MOBILE_PX = 72;
export const LISTING_CONTENT_FILTER_BASE_STICKY_TOP_MD_PX = 80;

/**
 * Extra offset (px) for a banner or chrome above the listing header, applied
 * to both mobile and md+ sticky filter bar positions.
 */
export const LISTING_CONTENT_FILTER_EXTRA_TOP_BANNER_PX = 13;

export type ListingContentFilterStickyTopOffsets = {
  mobilePx: number;
  mdPx: number;
};

export function getListingContentFilterStickyTopOffsets(
  extraTopBannerPx: number = LISTING_CONTENT_FILTER_EXTRA_TOP_BANNER_PX
): ListingContentFilterStickyTopOffsets {
  return {
    mobilePx:
      LISTING_CONTENT_FILTER_BASE_STICKY_TOP_MOBILE_PX + extraTopBannerPx,
    mdPx: LISTING_CONTENT_FILTER_BASE_STICKY_TOP_MD_PX + extraTopBannerPx
  };
}
