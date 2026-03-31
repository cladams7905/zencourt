/**
 * Vertical clearance for the listing create filter bar (`sticky top`) below the
 * listing header. Add {@link LISTING_CREATE_FILTER_EXTRA_TOP_BANNER_PX} when a
 * global banner sits above the header.
 */
export const LISTING_CREATE_FILTER_BASE_STICKY_TOP_MOBILE_PX = 72;
export const LISTING_CREATE_FILTER_BASE_STICKY_TOP_MD_PX = 80;

/**
 * Extra offset (px) for a banner or chrome above the listing header, applied
 * to both mobile and md+ sticky filter bar positions.
 */
export const LISTING_CREATE_FILTER_EXTRA_TOP_BANNER_PX = 13;

export type ListingCreateFilterStickyTopOffsets = {
  mobilePx: number;
  mdPx: number;
};

export function getListingCreateFilterStickyTopOffsets(
  extraTopBannerPx: number = LISTING_CREATE_FILTER_EXTRA_TOP_BANNER_PX
): ListingCreateFilterStickyTopOffsets {
  return {
    mobilePx:
      LISTING_CREATE_FILTER_BASE_STICKY_TOP_MOBILE_PX + extraTopBannerPx,
    mdPx: LISTING_CREATE_FILTER_BASE_STICKY_TOP_MD_PX + extraTopBannerPx
  };
}
