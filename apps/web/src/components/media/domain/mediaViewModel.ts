import type { DBUserMedia, UserMediaType } from "@shared/types/models";
import type { MediaUsageSort } from "@web/src/components/media/shared";

export const formatUploadDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
};

export const filterAndSortMedia = (input: {
  mediaItems: DBUserMedia[];
  selectedTypes: UserMediaType[];
  usageSort: MediaUsageSort;
}) => {
  const { mediaItems, selectedTypes, usageSort } = input;
  let nextItems = [...mediaItems];

  if (selectedTypes.length > 0) {
    nextItems = nextItems.filter((item) => selectedTypes.includes(item.type));
  }

  if (usageSort === "most-used") {
    nextItems.sort((a, b) => b.usageCount - a.usageCount);
  } else if (usageSort === "least-used") {
    nextItems.sort((a, b) => a.usageCount - b.usageCount);
  }

  return nextItems;
};

export const buildMediaCounts = (mediaItems: DBUserMedia[]) => {
  return {
    totalImages: mediaItems.filter((item) => item.type === "image").length,
    totalVideos: mediaItems.filter((item) => item.type === "video").length
  };
};
