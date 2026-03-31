import type { PreviewTimelineClip } from "@web/src/lib/domain/listings/content/previewTypes";
import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";

export type PreviewClipCandidate = PreviewTimelineClip & {
  searchableText: string;
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
