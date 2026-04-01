import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";
import { buildFeatureNeedle } from "@web/src/components/listings/content/domain/shared/utils";

export type ListingContentImage = {
  id: string;
  url: string;
  category: string | null;
  recommendationScore: number | null;
  shotType?: string | null;
  uploadedAtMs: number;
};

export function rankListingImagesForItem(
  images: ListingContentImage[],
  item: ContentItem
): ListingContentImage[] {
  const needle = buildFeatureNeedle(item);
  return [...images].sort((a, b) => {
    const aRoom = a.shotType === "detail" ? 0 : 1;
    const bRoom = b.shotType === "detail" ? 0 : 1;
    if (aRoom !== bRoom) {
      return bRoom - aRoom;
    }

    const aCategoryMatch =
      a.category && needle.includes(a.category.toLowerCase()) ? 1 : 0;
    const bCategoryMatch =
      b.category && needle.includes(b.category.toLowerCase()) ? 1 : 0;
    if (aCategoryMatch !== bCategoryMatch) {
      return bCategoryMatch - aCategoryMatch;
    }

    const aScore = a.recommendationScore ?? -Infinity;
    const bScore = b.recommendationScore ?? -Infinity;
    if (aScore !== bScore) {
      return bScore - aScore;
    }

    return b.uploadedAtMs - a.uploadedAtMs;
  });
}

function hashImageSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

export function buildVariedImageSequence(
  images: ListingContentImage[],
  seed: string
): ListingContentImage[] {
  if (images.length <= 1) {
    return images;
  }

  const total = images.length;
  const start = hashImageSeed(`${seed}:start`) % total;
  let step = (hashImageSeed(`${seed}:step`) % (total - 1)) + 1;
  while (gcd(step, total) !== 1) {
    step = (step % (total - 1)) + 1;
  }

  const sequence: ListingContentImage[] = [];
  let cursor = start;
  for (let i = 0; i < total; i += 1) {
    sequence.push(images[cursor]!);
    cursor = (cursor + step) % total;
  }

  return sequence;
}
