import { isPriorityCategory } from "@shared/utils";
import type { ListingContentSubcategory } from "@shared/types/models";
import type {
  PreviewTextOverlay,
  PreviewTextOverlayBackground,
  PreviewTextOverlayFont,
  PreviewTextOverlayPosition
} from "@shared/types/video";
import type {
  CarouselSlide,
  ReelSequenceItem
} from "./index";
import { buildReelSourceKey } from "./reels";

export type {
  PreviewTextOverlay,
  PreviewTextOverlayBackground,
  PreviewTextOverlayFont,
  PreviewTextOverlayPosition
};

export interface PreviewTimelineClip {
  id: string;
  category?: string | null;
  durationSeconds?: number | null;
  isPriorityCategory?: boolean;
  sortOrder?: number | null;
}

export interface PreviewTimelineSegment {
  clipId: string;
  category: string | null;
  durationSeconds: number;
  maxDurationSeconds: number;
  sourceType?: "listing_clip" | "user_media";
  sourceId?: string;
  textOverlay?: PreviewTextOverlay;
}

export interface PreviewTimelinePlan {
  id: string;
  segments: PreviewTimelineSegment[];
  totalDurationSeconds: number;
}

export interface BuildPreviewTimelineOptions {
  clips: PreviewTimelineClip[];
  listingId: string;
  seedKey?: string;
}

export type PreviewPlanCaptionItem = {
  id: string;
  hook?: string;
  caption?: string | null;
  body?: CarouselSlide[] | null;
  brollQuery?: string | null;
  orderedClipIds?: string[] | null;
  clipDurationOverrides?: Record<string, number> | null;
  reelSequence?: ReelSequenceItem[] | null;
};

export type PreviewPlanClipItem = {
  id: string;
  reelClipSource?: "listing_clip" | "user_media";
  videoUrl?: string | null;
  category?: string | null;
  durationSeconds?: number | null;
  isPriorityCategory?: boolean;
  alt?: string;
  roomName?: string | null;
};

export type PreviewClipCandidate = PreviewTimelineClip & {
  searchableText: string;
};

const DEFAULT_CLIP_DURATION_SECONDS = 3;
const MIN_TIMELINE_CLIP_DURATION_SECONDS = 2;
const MIN_OVERRIDE_CLIP_DURATION_SECONDS = 0.5;
const PRIORITY_DURATION_MIN_RATIO = 0.75;
const PRIORITY_DURATION_MAX_RATIO = 1;
const STANDARD_DURATION_MIN_RATIO = 0.5;
const STANDARD_DURATION_MAX_RATIO = 0.75;
const FEATURE_KEYWORDS = [
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

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRng(seed: string): () => number {
  let state = hashSeed(seed) || 123456789;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function getEffectiveDurationSeconds(
  clip: PreviewTimelineClip,
  rng: () => number
): number {
  const sourceDuration = Math.max(
    MIN_TIMELINE_CLIP_DURATION_SECONDS,
    clip.durationSeconds ?? DEFAULT_CLIP_DURATION_SECONDS
  );
  const prioritized =
    clip.isPriorityCategory ?? isPriorityCategory(clip.category ?? "");
  const [minRatio, maxRatio] = prioritized
    ? [PRIORITY_DURATION_MIN_RATIO, PRIORITY_DURATION_MAX_RATIO]
    : [STANDARD_DURATION_MIN_RATIO, STANDARD_DURATION_MAX_RATIO];
  const ratio = minRatio + (maxRatio - minRatio) * rng();
  const duration = sourceDuration * ratio;
  return Number(
    Math.min(
      sourceDuration,
      Math.max(MIN_TIMELINE_CLIP_DURATION_SECONDS, duration)
    ).toFixed(2)
  );
}

function orderClips(
  clips: PreviewTimelineClip[],
  rng: () => number
): PreviewTimelineClip[] {
  const ordered = [...clips].sort(
    (a, b) =>
      (a.sortOrder ?? Number.MAX_SAFE_INTEGER) -
      (b.sortOrder ?? Number.MAX_SAFE_INTEGER)
  );

  for (let i = ordered.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
  }

  return ordered;
}

function buildFeatureNeedle(item: PreviewPlanCaptionItem): string {
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

function filterFeatureClips(
  clips: PreviewClipCandidate[],
  captionItem: PreviewPlanCaptionItem
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

function buildAutoGeneratedPreviewSeed(params: {
  activeSubcategory: ListingContentSubcategory;
  captionItem: PreviewPlanCaptionItem & {
    cacheKeyTimestamp?: number;
    cacheKeyId?: number;
  };
}) {
  const { activeSubcategory, captionItem } = params;

  if (
    typeof captionItem.cacheKeyTimestamp === "number" &&
    typeof captionItem.cacheKeyId === "number"
  ) {
    return `${activeSubcategory}-${captionItem.cacheKeyTimestamp}-${captionItem.cacheKeyId}`;
  }

  return `${activeSubcategory}-${captionItem.id}`;
}

function applyOrderedClipIds(
  plan: PreviewTimelinePlan,
  orderedClipIds: string[] | null | undefined
): PreviewTimelinePlan {
  if (!orderedClipIds?.length) {
    return plan;
  }

  const segmentByClipId = new Map(
    plan.segments.map((segment) => [segment.clipId, segment])
  );
  const orderedSegments = orderedClipIds
    .map((clipId) => segmentByClipId.get(clipId))
    .filter(
      (segment): segment is PreviewTimelinePlan["segments"][number] =>
        Boolean(segment)
    );
  const remainingSegments = plan.segments.filter(
    (segment) => !orderedClipIds.includes(segment.clipId)
  );

  if (orderedSegments.length === 0) {
    return plan;
  }

  return {
    ...plan,
    segments: [...orderedSegments, ...remainingSegments]
  };
}

function applyClipDurationOverrides(
  plan: PreviewTimelinePlan,
  clipDurationOverrides: Record<string, number> | null | undefined
): PreviewTimelinePlan {
  if (!clipDurationOverrides) {
    return plan;
  }

  const segments = plan.segments.map((segment) => {
    const override = clipDurationOverrides[segment.clipId];
    if (!Number.isFinite(override)) {
      return segment;
    }

    return {
      ...segment,
      durationSeconds: normalizeDurationSeconds({
        durationSeconds: override,
        maxDurationSeconds: segment.maxDurationSeconds
      })
    };
  });

  return {
    ...plan,
    segments,
    totalDurationSeconds: Number(
      segments
        .reduce((sum, segment) => sum + segment.durationSeconds, 0)
        .toFixed(2)
    )
  };
}

function normalizeDurationSeconds(params: {
  durationSeconds: number;
  maxDurationSeconds: number;
  minDurationSeconds?: number;
}) {
  const {
    durationSeconds,
    maxDurationSeconds,
    minDurationSeconds = MIN_OVERRIDE_CLIP_DURATION_SECONDS
  } = params;
  return Number(
    Math.min(maxDurationSeconds, Math.max(minDurationSeconds, durationSeconds)).toFixed(
      2
    )
  );
}

export function buildPreviewTimelinePlan(
  options: BuildPreviewTimelineOptions
): PreviewTimelinePlan {
  const { clips, listingId, seedKey } = options;
  const resolvedSeedKey = seedKey?.trim() ? seedKey.trim() : "base";
  const rng = createSeededRng(`${listingId}:${resolvedSeedKey}`);
  const ordered = orderClips(clips, rng);

  const segments: PreviewTimelineSegment[] = ordered.map((clip) => ({
    clipId: clip.id,
    category: clip.category ?? null,
    durationSeconds: getEffectiveDurationSeconds(clip, rng),
    maxDurationSeconds: Math.max(
      MIN_TIMELINE_CLIP_DURATION_SECONDS,
      clip.durationSeconds ?? DEFAULT_CLIP_DURATION_SECONDS
    )
  }));

  const totalDurationSeconds = Number(
    segments.reduce((acc, segment) => acc + segment.durationSeconds, 0).toFixed(2)
  );

  return {
    id: `plan-${resolvedSeedKey}`,
    segments,
    totalDurationSeconds
  };
}

export function buildPreviewTimelinePlans(
  clips: PreviewTimelineClip[],
  listingId: string,
  count: number,
  seedPrefix = "series"
): PreviewTimelinePlan[] {
  if (clips.length === 0 || count <= 0) {
    return [];
  }

  return Array.from({ length: count }, (_, index) =>
    buildPreviewTimelinePlan({
      clips,
      listingId,
      seedKey: `${seedPrefix}-${index + 1}`
    })
  );
}

export function buildPreviewTimelineVariants(
  clips: PreviewTimelineClip[],
  listingId: string
): PreviewTimelinePlan[] {
  return buildPreviewTimelinePlans(clips, listingId, 3);
}

export function buildListingCreatePreviewPlans(params: {
  listingId: string;
  activeMediaTab: "videos" | "images";
  activeSubcategory: ListingContentSubcategory;
  activeContentItems: PreviewPlanCaptionItem[];
  listingClipItems: PreviewPlanClipItem[];
}): PreviewTimelinePlan[] {
  const {
    listingId,
    activeMediaTab,
    activeSubcategory,
    activeContentItems,
    listingClipItems
  } = params;

  if (activeMediaTab !== "videos") {
    return [];
  }

  const clipCandidates: PreviewClipCandidate[] = listingClipItems
    .filter((item) => item.reelClipSource !== "user_media")
    .filter((item) => Boolean(item.videoUrl))
    .map((item) => ({
      id: item.id,
      category: item.category ?? null,
      durationSeconds: item.durationSeconds ?? null,
      isPriorityCategory: item.isPriorityCategory ?? false,
      searchableText: `${item.category ?? ""} ${item.alt ?? ""}`
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
    }));
  const clipById = new Map(
    listingClipItems
      .filter((item) => Boolean(item.videoUrl))
      .map((item) => [item.id, item] as const)
  );

  if (activeContentItems.length === 0) {
    return [];
  }

  return activeContentItems.map((captionItem): PreviewTimelinePlan => {
    if (captionItem.reelSequence?.length) {
      const segments = captionItem.reelSequence
        .map((sequenceItem) => {
          const clipId = buildReelSourceKey(
            sequenceItem.sourceType,
            sequenceItem.sourceId
          );
          const sourceItem = clipById.get(clipId);
          if (!sourceItem?.videoUrl) {
            return null;
          }

          const maxDurationSeconds = Math.max(
            MIN_OVERRIDE_CLIP_DURATION_SECONDS,
            sourceItem.durationSeconds ?? sequenceItem.durationSeconds
          );

          return {
            clipId,
            category: sourceItem.category ?? sourceItem.roomName ?? null,
            durationSeconds: normalizeDurationSeconds({
              durationSeconds: sequenceItem.durationSeconds,
              maxDurationSeconds
            }),
            maxDurationSeconds,
            sourceType: sequenceItem.sourceType,
            sourceId: sequenceItem.sourceId
          };
        })
        .filter(
          (segment): segment is NonNullable<typeof segment> => Boolean(segment)
        );

      return {
        id: `saved-plan-${captionItem.id}`,
        segments,
        totalDurationSeconds: Number(
          segments
            .reduce((sum, segment) => sum + segment.durationSeconds, 0)
            .toFixed(2)
        )
      };
    }

    if (clipCandidates.length === 0) {
      return {
        id: `plan-${activeSubcategory}-${captionItem.id}`,
        segments: [],
        totalDurationSeconds: 0
      };
    }

    const scopedClips =
      activeSubcategory === "property_features"
        ? filterFeatureClips(clipCandidates, captionItem)
        : clipCandidates;
    const plan = buildPreviewTimelinePlan({
      clips: scopedClips,
      listingId,
      seedKey: buildAutoGeneratedPreviewSeed({
        activeSubcategory,
        captionItem
      })
    });

    return applyClipDurationOverrides(
      applyOrderedClipIds(plan, captionItem.orderedClipIds),
      captionItem.clipDurationOverrides
    );
  });
}
