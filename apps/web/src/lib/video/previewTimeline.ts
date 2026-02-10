import {
  isPriorityCategory,
  normalizeRoomCategory
} from "@shared/types/video";

export type PreviewTransition =
  | "crossfade"
  | "slide-left"
  | "push"
  | "light-flash"
  | "zoom-settle"
  | "wipe";

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
  transitionToNext?: PreviewTransition;
}

export interface PreviewTimelinePlan {
  id: string;
  segments: PreviewTimelineSegment[];
  totalDurationSeconds: number;
}

export interface BuildPreviewTimelineOptions {
  clips: PreviewTimelineClip[];
  listingId: string;
  transitionDurationSeconds?: number;
  seedKey?: string;
}

const DEFAULT_CLIP_DURATION_SECONDS = 3;
const DEFAULT_TRANSITION_DURATION_SECONDS = 0;
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

function pullClip(
  pool: PreviewTimelineClip[],
  rng: () => number
): PreviewTimelineClip {
  const lookahead = Math.min(3, pool.length);
  const index = Math.floor(rng() * lookahead);
  return pool.splice(index, 1)[0]!;
}

function orderClips(
  clips: PreviewTimelineClip[],
  rng: () => number
): PreviewTimelineClip[] {
  const sorted = [...clips].sort(
    (a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER)
  );
  const priority = sorted.filter(
    (clip) => clip.isPriorityCategory ?? isPriorityCategory(clip.category ?? "")
  );
  const standard = sorted.filter(
    (clip) => !(clip.isPriorityCategory ?? isPriorityCategory(clip.category ?? ""))
  );

  const ordered: PreviewTimelineClip[] = [];
  let preferPriority = rng() >= 0.5;
  while (priority.length > 0 || standard.length > 0) {
    const primary = preferPriority ? priority : standard;
    const secondary = preferPriority ? standard : priority;

    if (primary.length > 0) {
      ordered.push(pullClip(primary, rng));
    }

    if (secondary.length > 0 && (ordered.length < 2 || rng() >= 0.2)) {
      ordered.push(pullClip(secondary, rng));
    }

    preferPriority = !preferPriority;
  }

  for (let i = 1; i < ordered.length; i += 1) {
    const previous = normalizeRoomCategory(ordered[i - 1].category ?? "");
    const current = normalizeRoomCategory(ordered[i].category ?? "");
    if (!previous || !current || previous !== current) {
      continue;
    }
    // Keep intentionally paired priority clips adjacent
    const prevSort = ordered[i - 1].sortOrder ?? -1;
    const currSort = ordered[i].sortOrder ?? -1;
    if (currSort === prevSort + 1 && isPriorityCategory(current)) {
      continue;
    }
    let swapIndex = -1;
    for (let j = i + 1; j < ordered.length; j += 1) {
      const candidate = normalizeRoomCategory(ordered[j].category ?? "");
      if (candidate && candidate !== previous) {
        swapIndex = j;
        break;
      }
    }
    if (swapIndex > i) {
      [ordered[i], ordered[swapIndex]] = [ordered[swapIndex], ordered[i]];
    }
  }

  if (ordered.length > 1 && rng() > 0.65) {
    const last = ordered.pop();
    if (last) {
      ordered.splice(1, 0, last);
    }
  }

  const swapPasses = Math.min(3, Math.floor(ordered.length / 3));
  for (let pass = 0; pass < swapPasses; pass += 1) {
    const i = Math.floor(rng() * ordered.length);
    const j = Math.floor(rng() * ordered.length);
    if (i === j) {
      continue;
    }
    const aCategory = normalizeRoomCategory(ordered[i]?.category ?? "");
    const bCategory = normalizeRoomCategory(ordered[j]?.category ?? "");
    if (aCategory && bCategory && aCategory === bCategory) {
      continue;
    }
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
  }

  return ordered;
}

function pickTransition(
  current: PreviewTimelineClip,
  next: PreviewTimelineClip,
  rng: () => number,
  previousTransition?: PreviewTransition
): PreviewTransition {
  const currentCategory = normalizeRoomCategory(current.category ?? "");
  const nextCategory = normalizeRoomCategory(next.category ?? "");
  const currentPriority =
    current.isPriorityCategory ?? isPriorityCategory(current.category ?? "");
  const nextPriority =
    next.isPriorityCategory ?? isPriorityCategory(next.category ?? "");

  const currentExterior = currentCategory.startsWith("exterior");
  const nextExterior = nextCategory.startsWith("exterior");

  let pool: PreviewTransition[];
  if (currentCategory && nextCategory && currentCategory === nextCategory) {
    pool = ["wipe", "crossfade"];
  } else if (currentPriority && nextPriority) {
    pool = ["push", "slide-left", "crossfade"];
  } else if (!currentExterior && nextExterior) {
    pool = ["light-flash", "slide-left", "crossfade"];
  } else if (currentExterior && !nextExterior) {
    pool = ["zoom-settle", "crossfade"];
  } else {
    pool = ["crossfade", "slide-left", "push", "wipe"];
  }

  if (previousTransition && pool.length > 1) {
    const deduped = pool.filter((item) => item !== previousTransition);
    if (deduped.length > 0) {
      pool = deduped;
    }
  }

  const index = Math.floor(rng() * pool.length);
  return pool[index] ?? "crossfade";
}

export function buildPreviewTimelinePlan(
  options: BuildPreviewTimelineOptions
): PreviewTimelinePlan {
  const { clips, listingId, transitionDurationSeconds, seedKey } = options;
  const resolvedSeedKey = seedKey?.trim() ? seedKey.trim() : "base";
  const rng = createSeededRng(`${listingId}:${resolvedSeedKey}`);
  const ordered = orderClips(clips, rng);

  const segments: PreviewTimelineSegment[] = [];
  let previousTransition: PreviewTransition | undefined;
  for (let i = 0; i < ordered.length; i += 1) {
    const clip = ordered[i];
    const next = ordered[i + 1];
    const transitionToNext = next
      ? pickTransition(clip, next, rng, previousTransition)
      : undefined;
    if (transitionToNext) {
      previousTransition = transitionToNext;
    }
    segments.push({
      clipId: clip.id,
      category: clip.category ?? null,
      durationSeconds: getEffectiveDurationSeconds(clip, rng),
      transitionToNext
    });
  }

  const transitionsCount = Math.max(0, segments.length - 1);
  const totalDurationSeconds = Number(
    (
      segments.reduce((acc, segment) => acc + segment.durationSeconds, 0) +
      transitionsCount *
        (transitionDurationSeconds ?? DEFAULT_TRANSITION_DURATION_SECONDS)
    ).toFixed(2)
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
