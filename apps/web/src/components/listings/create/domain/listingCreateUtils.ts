import type { PreviewTimelineClip } from "@web/src/components/listings/create/domain/previewTimeline";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import type { ListingImagePreviewItem } from "@web/src/components/listings/create/shared/types";
import type {
  ListingTemplateRenderedItem,
  TemplateRenderCaptionItemInput
} from "@web/src/lib/domain/media/templateRender/types";

export type PreviewClipCandidate = PreviewTimelineClip & {
  searchableText: string;
};

export type ListingCreateImage = {
  id: string;
  url: string;
  category: string | null;
  isPrimary: boolean;
  primaryScore: number | null;
  uploadedAtMs: number;
};

export const FEATURE_KEYWORDS = [
  "kitchen",
  "countertop",
  "granite",
  "pantry",
  "breakfast bar",
  "island",
  "bedroom",
  "bathroom",
  "tub",
  "shower",
  "closet",
  "laundry",
  "den",
  "office",
  "living room",
  "great room",
  "open concept",
  "hardwood",
  "porch",
  "deck",
  "yard",
  "firepit",
  "shed",
  "garage",
  "exterior",
  "acre",
  "lot",
  "suite"
];

export function buildFeatureNeedle(item: ContentItem): string {
  const bodyText = (item.body ?? [])
    .map(
      (slide) =>
        `${slide.header ?? ""} ${slide.content ?? ""} ${slide.broll_query ?? ""}`
    )
    .join(" ");
  return `${item.hook ?? ""} ${item.caption ?? ""} ${item.brollQuery ?? ""} ${bodyText}`
    .toLowerCase()
    .replace(/[^\w\s]/g, " ");
}

export function filterFeatureClips(
  clips: PreviewClipCandidate[],
  captionItem: ContentItem
): PreviewClipCandidate[] {
  const needle = buildFeatureNeedle(captionItem);
  const matchedKeywords = FEATURE_KEYWORDS.filter((keyword) =>
    needle.includes(keyword)
  );

  if (matchedKeywords.length === 0) {
    return clips;
  }

  const matched = clips.filter((clip) =>
    matchedKeywords.some((keyword) => clip.searchableText.includes(keyword))
  );

  if (matched.length >= 2) {
    return matched;
  }

  if (matched.length === 1 && clips.length > 1) {
    const fallback = clips.find((clip) => clip.id !== matched[0]?.id);
    return fallback ? [matched[0], fallback] : matched;
  }

  return clips;
}

export function resolveContentMediaType(item: ContentItem): "video" | "image" {
  return item.mediaType === "image" ? "image" : "video";
}

export function rankListingImagesForItem(
  images: ListingCreateImage[],
  item: ContentItem
): ListingCreateImage[] {
  const needle = buildFeatureNeedle(item);
  return [...images].sort((a, b) => {
    const aPrimary = a.isPrimary ? 1 : 0;
    const bPrimary = b.isPrimary ? 1 : 0;
    if (aPrimary !== bPrimary) {
      return bPrimary - aPrimary;
    }

    const aCategoryMatch =
      a.category && needle.includes(a.category.toLowerCase()) ? 1 : 0;
    const bCategoryMatch =
      b.category && needle.includes(b.category.toLowerCase()) ? 1 : 0;
    if (aCategoryMatch !== bCategoryMatch) {
      return bCategoryMatch - aCategoryMatch;
    }

    const aScore = a.primaryScore ?? -Infinity;
    const bScore = b.primaryScore ?? -Infinity;
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
  images: ListingCreateImage[],
  seed: string
): ListingCreateImage[] {
  if (images.length <= 1) {
    return images;
  }

  const total = images.length;
  const start = hashImageSeed(`${seed}:start`) % total;
  let step = (hashImageSeed(`${seed}:step`) % (total - 1)) + 1;
  while (gcd(step, total) !== 1) {
    step = (step % (total - 1)) + 1;
  }

  const sequence: ListingCreateImage[] = [];
  let cursor = start;
  for (let i = 0; i < total; i += 1) {
    sequence.push(images[cursor]!);
    cursor = (cursor + step) % total;
  }

  return sequence;
}

export function buildTemplateRenderCaptionItems(
  items: ContentItem[]
): TemplateRenderCaptionItemInput[] {
  return items
    .map((item) => ({
      id: item.id,
      hook: item.hook?.trim() || null,
      caption: item.caption?.trim() || null,
      body: (item.body ?? [])
        .map((slide) => ({
          header: slide.header?.trim() ?? "",
          content: slide.content?.trim() ?? ""
        }))
        .filter((slide) => slide.header || slide.content)
    }))
    .filter((item) => item.hook || item.caption || item.body.length > 0);
}

export function mapTemplateRenderItemsToPreviewItems(params: {
  renderedItems: ListingTemplateRenderedItem[];
  captionItems: TemplateRenderCaptionItemInput[];
}): ListingImagePreviewItem[] {
  const captionById = new Map(
    params.captionItems.map((item) => [item.id, item] as const)
  );

  return params.renderedItems.map((renderedItem, index) => {
    const matchedCaption = captionById.get(renderedItem.captionItemId);
    const fallbackHeader = matchedCaption?.hook || "Listing";
    const fallbackContent = matchedCaption?.caption || "";
    return {
      id: `template-render-${renderedItem.templateId}-${renderedItem.captionItemId}-${index}`,
      variationNumber: index + 1,
      hook: matchedCaption?.hook ?? null,
      caption: matchedCaption?.caption ?? null,
      slides: [
        {
          id: `${renderedItem.templateId}-render`,
          imageUrl: renderedItem.imageUrl,
          header: fallbackHeader,
          content: fallbackContent,
          textOverlay: null
        }
      ],
      coverImageUrl: renderedItem.imageUrl
    };
  });
}
