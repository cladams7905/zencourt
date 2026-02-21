import { isPriorityCategory } from "@shared/utils";
import type {
  PreviewTextOverlay,
  PreviewTextOverlayBackground,
  PreviewTextOverlayFont,
  PreviewTextOverlayPosition
} from "@shared/types/video";

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

const DEFAULT_CLIP_DURATION_SECONDS = 3;
const MIN_CLIP_DURATION_SECONDS = 2;
const PRIORITY_DURATION_MIN_RATIO = 0.75;
const PRIORITY_DURATION_MAX_RATIO = 1;
const STANDARD_DURATION_MIN_RATIO = 0.5;
const STANDARD_DURATION_MAX_RATIO = 0.75;

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
    MIN_CLIP_DURATION_SECONDS,
    clip.durationSeconds ?? DEFAULT_CLIP_DURATION_SECONDS
  );
  const prioritized = clip.isPriorityCategory ?? isPriorityCategory(clip.category ?? "");
  const [minRatio, maxRatio] = prioritized
    ? [PRIORITY_DURATION_MIN_RATIO, PRIORITY_DURATION_MAX_RATIO]
    : [STANDARD_DURATION_MIN_RATIO, STANDARD_DURATION_MAX_RATIO];
  const ratio = minRatio + (maxRatio - minRatio) * rng();
  const duration = sourceDuration * ratio;
  return Number(
    Math.min(sourceDuration, Math.max(MIN_CLIP_DURATION_SECONDS, duration)).toFixed(2)
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

  // Uniform Fisher-Yates shuffle so every clip has equal chance to be first.
  for (let i = ordered.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
  }

  return ordered;
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
    durationSeconds: getEffectiveDurationSeconds(clip, rng)
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

  return Array.from({ length: count }, (_, index) => {
    return buildPreviewTimelinePlan({
      clips,
      listingId,
      seedKey: `${seedPrefix}-${index + 1}`
    });
  });
}

export function buildPreviewTimelineVariants(
  clips: PreviewTimelineClip[],
  listingId: string
): PreviewTimelinePlan[] {
  return buildPreviewTimelinePlans(clips, listingId, 3);
}
