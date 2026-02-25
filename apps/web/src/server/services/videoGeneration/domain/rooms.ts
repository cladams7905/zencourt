import { ApiError } from "@web/src/server/errors/api";
import {
  ROOM_CATEGORIES,
  RoomCategory
} from "@web/src/lib/domain/listing/roomCategories";
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
    if (!image.category || !image.url) {
      return;
    }

    if (!grouped.has(image.category)) {
      grouped.set(image.category, []);
    }

    grouped.get(image.category)!.push(image);
  });

  grouped.forEach((imagesForCategory) => {
    imagesForCategory.sort((a, b) => {
      const primaryA = a.isPrimary ? 1 : 0;
      const primaryB = b.isPrimary ? 1 : 0;
      if (primaryA !== primaryB) {
        return primaryB - primaryA;
      }
      const timeA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const timeB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return timeA - timeB;
    });
  });

  return grouped;
}

export function selectListingPrimaryImage(
  listingImages: DBListingImage[]
): DBListingImage {
  const primaryImage = listingImages.find((image) => image.isPrimary && image.url);

  if (!primaryImage?.url) {
    throw new ApiError(400, {
      error: "Missing images",
      message: "Primary image missing for listing"
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
  const primaryImage = availableImages.find(
    (image) => image.isPrimary && image.url
  );

  if (primaryImage?.url) {
    return primaryImage.url;
  }

  return listingPrimaryImageUrl;
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
      const scoreA = a.primaryScore ?? -1;
      const scoreB = b.primaryScore ?? -1;
      return scoreB - scoreA;
    })[0];

  return secondary?.url ?? null;
}
