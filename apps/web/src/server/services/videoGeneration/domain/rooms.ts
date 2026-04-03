import { ApiError } from "@web/src/server/errors/api";
import {
  ROOM_CATEGORIES,
  RoomCategory
} from "@web/src/lib/domain/listings/image/roomCategories";
import type { CameraMotionVariantId } from "@shared/types/models";
import type { DBListingImage } from "@db/types/models";

export type DerivedRoom = {
  id: string;
  name: string;
  category: string;
  roomNumber?: number;
  imageCount?: number;
};

export function getCategoryForRoom(room: {
  id: string;
  category?: string;
}): string {
  if (room.category) {
    return room.category;
  }

  if (ROOM_CATEGORIES[room.id as RoomCategory]) {
    return room.id;
  }

  const trimmed = room.id.replace(/-\d+$/, "");
  if (ROOM_CATEGORIES[trimmed as RoomCategory]) {
    return trimmed;
  }

  return trimmed;
}

export function groupImagesByCategory(
  listingImagesByCategory: DBListingImage[]
): Map<string, DBListingImage[]> {
  const grouped = new Map<string, DBListingImage[]>();

  listingImagesByCategory.forEach((image) => {
    if (!image.category || !image.url || image.category === "other") {
      return;
    }

    if (!grouped.has(image.category)) {
      grouped.set(image.category, []);
    }

    grouped.get(image.category)!.push(image);
  });

  grouped.forEach((imagesForCategory) => {
    imagesForCategory.sort((a, b) => {
      const scoreA = a.recommendationScore ?? -Infinity;
      const scoreB = b.recommendationScore ?? -Infinity;
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      const timeA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const timeB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return timeB - timeA;
    });
  });

  return grouped;
}

export function selectListingPrimaryImage(
  listingImages: DBListingImage[]
): DBListingImage {
  const primaryImage = [...listingImages]
    .filter(
      (image) =>
        image.url &&
        image.analysisStatus === "complete" &&
        image.category !== "other" &&
        image.shotType !== "detail"
    )
    .sort(
      (a, b) =>
        (b.recommendationScore ?? -Infinity) - (a.recommendationScore ?? -Infinity)
    )[0];

  if (!primaryImage?.url) {
    throw new ApiError(400, {
      error: "Missing images",
      message: "Recommended listing image missing for listing"
    });
  }

  return primaryImage;
}

export function buildRoomsFromImages(
  groupedImages: Map<string, DBListingImage[]>
): DerivedRoom[] {
  const categories = Array.from(groupedImages.keys());
  if (categories.length === 0) {
    return [];
  }

  const orderedCategories = orderRoomCategories(categories);

  return orderedCategories.map((category) =>
    mapCategoryToDerivedRoom(category, groupedImages)
  );
}

function orderRoomCategories(categories: string[]): string[] {
  const baseOrder = Object.values(ROOM_CATEGORIES)
    .sort((a, b) => a.order - b.order)
    .map((category) => category.id);

  const used = new Set<string>();
  const ordered: string[] = [];

  baseOrder.forEach((base) => {
    const matches = categories
      .filter(
        (category) => category === base || category.startsWith(`${base}-`)
      )
      .sort((a, b) => {
        const getSuffix = (value: string) => {
          const match = value.match(/-(\d+)$/);
          return match ? Number(match[1]) : 0;
        };
        return getSuffix(a) - getSuffix(b);
      });
    matches.forEach((match) => {
      ordered.push(match);
      used.add(match);
    });
  });

  const remaining = categories
    .filter((category) => !used.has(category))
    .sort((a, b) => a.localeCompare(b));

  return [...ordered, ...remaining];
}

function getRoomLabelParts(category: string): {
  label: string;
  roomNumber?: number;
} {
  const base = category.replace(/-\d+$/, "");
  const metadata = ROOM_CATEGORIES[base as RoomCategory];
  const label =
    metadata?.label ??
    base.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  const numberMatch = category.match(/-(\d+)$/);
  const roomNumber = numberMatch ? Number(numberMatch[1]) : undefined;
  const name =
    metadata?.allowNumbering && roomNumber ? `${label} ${roomNumber}` : label;

  return {
    label: name,
    roomNumber
  };
}

function mapCategoryToDerivedRoom(
  category: string,
  groupedImages: Map<string, DBListingImage[]>
): DerivedRoom {
  const { label, roomNumber } = getRoomLabelParts(category);

  return {
    id: category,
    name: label,
    category,
    roomNumber,
    imageCount: groupedImages.get(category)?.length ?? 0
  };
}

export function selectPrimaryImageForRoom(
  room: { id: string; name: string; category: string },
  groupedImages: Map<string, DBListingImage[]>,
  listingPrimaryImageUrl: string
): string {
  const availableImages = groupedImages.get(room.category) || [];
  const primaryImage = [...availableImages]
    .filter((image) => image.url && image.shotType !== "detail")
    .sort(
      (a, b) =>
        (b.recommendationScore ?? -Infinity) - (a.recommendationScore ?? -Infinity)
    )[0];

  if (primaryImage?.url) {
    return primaryImage.url;
  }

  return listingPrimaryImageUrl;
}

export function hasPersistedSceneSelectionForRoom(
  room: { category: string },
  groupedImages: Map<string, DBListingImage[]>
): boolean {
  const availableImages = groupedImages.get(room.category) || [];
  return availableImages.some(
    (image) => typeof image.metadata?.videoScene?.selected === "boolean"
  );
}

export function getSelectedSceneImagesForRoom(
  room: { category: string },
  groupedImages: Map<string, DBListingImage[]>
): DBListingImage[] {
  const availableImages = groupedImages.get(room.category) || [];

  return [...availableImages]
    .filter((image) => image.metadata?.videoScene?.selected === true)
    .sort((a, b) => {
      const scoreA = a.recommendationScore ?? -Infinity;
      const scoreB = b.recommendationScore ?? -Infinity;
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      const timeA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const timeB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return timeB - timeA;
    });
}

export function getImageMotionVariantId(
  image: DBListingImage | undefined
): CameraMotionVariantId {
  return image?.metadata?.videoScene?.motionVariantId ?? "default";
}

export function selectSecondaryImageForRoom(
  room: { id: string; name: string; category: string },
  groupedImages: Map<string, DBListingImage[]>,
  primaryImageUrl: string
): string | null {
  const availableImages = groupedImages.get(room.category) || [];

  const secondary = availableImages
    .filter((img) => img.url && img.url !== primaryImageUrl)
    .sort((a, b) => {
      const scoreA = a.recommendationScore ?? -1;
      const scoreB = b.recommendationScore ?? -1;
      return scoreB - scoreA;
    })[0];

  return secondary?.url ?? null;
}
