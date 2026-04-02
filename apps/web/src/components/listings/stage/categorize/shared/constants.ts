export const UNCATEGORIZED_CATEGORY_ID = "needs-categorization";
export const UNUSED_DOCK_DROP_ZONE_ID = "unused-dock";
export const RECOMMENDED_STRIP_DROP_ZONE_ID = "recommended-strip";

/** Max photos selected as “used” for video across the whole listing */
export const CATEGORIZE_MAX_USED_PHOTOS = 12;

/** Drag-over id for the per-category "remove from used" drop zone */
export const categoryDockDropZoneId = (category: string) =>
  `category-dock:${category}`;

/** Drag-over id for dropping onto a room's "used for video" strip */
export const categoryUsedDropZoneId = (category: string) =>
  `category-used:${category}`;
