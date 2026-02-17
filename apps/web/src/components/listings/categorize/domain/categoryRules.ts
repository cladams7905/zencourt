import { ROOM_CATEGORIES, type RoomCategory } from "@web/src/types/vision";
import { UNCATEGORIZED_CATEGORY_ID } from "@web/src/components/listings/categorize/shared/constants";

export const normalizeCategory = (value: string) => value.trim().toLowerCase();

export const MULTI_ROOM_CATEGORIES = new Set(
  Object.values(ROOM_CATEGORIES)
    .filter((category) => category.allowNumbering)
    .map((category) => category.id)
);

export const getCategoryBase = (category: string) => category.replace(/-\d+$/, "");

export const formatCategoryLabel = (
  category: string,
  baseCounts: Record<string, number>
) => {
  if (category === UNCATEGORIZED_CATEGORY_ID) {
    return "Uncategorized";
  }
  const baseCategory = getCategoryBase(category);
  const metadata = ROOM_CATEGORIES[baseCategory as RoomCategory];
  const baseLabel =
    metadata?.label ??
    baseCategory
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  const match = category.match(/-(\d+)$/);
  const roomNumber = match ? Number(match[1]) : 1;
  const shouldNumber =
    metadata?.allowNumbering && (baseCounts[baseCategory] ?? 0) > 1;

  if (shouldNumber) {
    return `${baseLabel} ${roomNumber}`;
  }

  return baseLabel;
};

export const getNextCategoryValue = (base: string, existing: string[]) => {
  const normalizedBase = normalizeCategory(base);
  let maxIndex = 0;

  existing.forEach((category) => {
    const normalized = normalizeCategory(category);
    if (normalized === normalizedBase) {
      maxIndex = Math.max(maxIndex, 1);
      return;
    }
    if (normalized.startsWith(`${normalizedBase}-`)) {
      const suffix = normalized.slice(normalizedBase.length + 1);
      const numberValue = Number(suffix);
      if (Number.isInteger(numberValue) && numberValue > 0) {
        maxIndex = Math.max(maxIndex, numberValue);
      }
    }
  });

  if (maxIndex === 0) {
    return normalizedBase;
  }

  return `${normalizedBase}-${maxIndex + 1}`;
};
