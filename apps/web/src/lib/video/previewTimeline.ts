import {
  isPriorityCategory,
  normalizeRoomCategory
} from "@shared/types/video";

export type PreviewVariant = "cinematic" | "energetic" | "luxury-flow";

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
  variant: PreviewVariant;
  segments: PreviewTimelineSegment[];
  totalDurationSeconds: number;
}

export interface BuildPreviewTimelineOptions {
  clips: PreviewTimelineClip[];
  listingId: string;
  variant: PreviewVariant;
  transitionDurationSeconds?: number;
}

const DEFAULT_CLIP_DURATION_SECONDS = 6;
const DEFAULT_TRANSITION_DURATION_SECONDS = 0.45;
const MIN_CLIP_DURATION_SECONDS = 2;

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
  variant: PreviewVariant
): number {
  const base = Math.max(
    MIN_CLIP_DURATION_SECONDS,
    clip.durationSeconds ?? DEFAULT_CLIP_DURATION_SECONDS
  );
  const prioritized = clip.isPriorityCategory ?? isPriorityCategory(clip.category ?? "");
  if (variant === "energetic") {
    return Math.max(MIN_CLIP_DURATION_SECONDS, Number((base * 0.82).toFixed(2)));
  }
  if (!prioritized) {
    return Math.max(MIN_CLIP_DURATION_SECONDS, Math.min(base, 6));
  }
  return Math.min(base, 8);
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
  while (priority.length > 0 || standard.length > 0) {
    if (priority.length > 0) {
      ordered.push(priority.shift()!);
    }
    if (standard.length > 0) {
      ordered.push(standard.shift()!);
    }
  }

  for (let i = 1; i < ordered.length; i += 1) {
    const previous = normalizeRoomCategory(ordered[i - 1].category ?? "");
    const current = normalizeRoomCategory(ordered[i].category ?? "");
    if (!previous || !current || previous !== current) {
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

  return ordered;
}

function pickTransition(
  current: PreviewTimelineClip,
  next: PreviewTimelineClip,
  variant: PreviewVariant,
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
  } else if (variant === "energetic") {
    pool = ["push", "slide-left", "crossfade"];
  } else if (variant === "luxury-flow") {
    pool = ["crossfade", "zoom-settle", "wipe"];
  } else {
    pool = ["crossfade", "slide-left", "wipe"];
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
  const { clips, listingId, variant, transitionDurationSeconds } = options;
  const rng = createSeededRng(`${listingId}:${variant}`);
  const ordered = orderClips(clips, rng);

  const segments: PreviewTimelineSegment[] = [];
  let previousTransition: PreviewTransition | undefined;
  for (let i = 0; i < ordered.length; i += 1) {
    const clip = ordered[i];
    const next = ordered[i + 1];
    const transitionToNext = next
      ? pickTransition(clip, next, variant, rng, previousTransition)
      : undefined;
    if (transitionToNext) {
      previousTransition = transitionToNext;
    }
    segments.push({
      clipId: clip.id,
      category: clip.category ?? null,
      durationSeconds: getEffectiveDurationSeconds(clip, variant),
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
    variant,
    segments,
    totalDurationSeconds
  };
}

export function buildPreviewTimelineVariants(
  clips: PreviewTimelineClip[],
  listingId: string
): PreviewTimelinePlan[] {
  if (clips.length === 0) {
    return [];
  }
  return (["cinematic", "energetic", "luxury-flow"] as const).map((variant) =>
    buildPreviewTimelinePlan({
      clips,
      listingId,
      variant
    })
  );
}
