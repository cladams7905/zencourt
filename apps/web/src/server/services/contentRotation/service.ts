import type { Redis } from "@web/src/server/services/cache/redis";
import {
  AUDIENCE_ROTATION_PREFIX,
  getCommunityCategoryCycleKey,
  shuffleArray,
  type CommunityCategoryCycleState,
  type CommunityCategoryKey
} from "./helpers";

export async function selectRotatedAudienceSegment(
  redis: Redis | null,
  userId: string,
  category: string,
  segments: string[]
): Promise<string[]> {
  const normalized = segments.filter(Boolean);
  if (normalized.length <= 1 || !redis) {
    return normalized.slice(0, 1);
  }

  const key = `${AUDIENCE_ROTATION_PREFIX}:${userId}:${category}`;
  try {
    const last = await redis.get<string>(key);
    const lastIndex = last ? normalized.indexOf(last) : -1;
    const next =
      lastIndex >= 0
        ? normalized[(lastIndex + 1) % normalized.length]
        : normalized[0];
    await redis.set(key, next);
    return [next];
  } catch {
    return normalized.slice(0, 1);
  }
}

export async function selectCommunityCategories(
  redis: Redis | null,
  userId: string,
  count: number,
  availableKeys: CommunityCategoryKey[]
): Promise<{ selected: CommunityCategoryKey[]; shouldRefresh: boolean }> {
  if (availableKeys.length === 0) {
    return { selected: [], shouldRefresh: false };
  }
  if (!redis) {
    return {
      selected: shuffleArray(availableKeys).slice(0, count),
      shouldRefresh: false
    };
  }

  const key = getCommunityCategoryCycleKey(userId);
  let remaining: CommunityCategoryKey[] | null = null;
  let cyclesCompleted = 0;

  try {
    const cached = await redis.get<
      CommunityCategoryCycleState | CommunityCategoryKey[]
    >(key);
    if (Array.isArray(cached)) {
      remaining = cached.filter((item) => availableKeys.includes(item));
    } else if (cached && Array.isArray(cached.remaining)) {
      remaining = cached.remaining.filter((item: CommunityCategoryKey) =>
        availableKeys.includes(item)
      );
      cyclesCompleted = cached.cyclesCompleted ?? 0;
    }
  } catch {
    /* no-op */
  }

  if (!remaining || remaining.length === 0) {
    cyclesCompleted += 1;
    remaining = shuffleArray(availableKeys);
  }

  let selected: CommunityCategoryKey[] = [];
  if (remaining.length >= count) {
    selected = remaining.slice(0, count);
    remaining = remaining.slice(count);
  } else {
    const carry = [...remaining];
    let refill = shuffleArray(availableKeys);
    if (carry.length === 1 && refill.length > 1 && refill[0] === carry[0]) {
      refill = refill.slice(1).concat(refill[0]);
    }
    const need = count - carry.length;
    selected = carry.concat(refill.slice(0, need));
    remaining = refill.slice(need);
  }

  try {
    const shouldRefresh = cyclesCompleted >= 2;
    const nextState: CommunityCategoryCycleState = {
      remaining,
      cyclesCompleted: shouldRefresh ? 0 : cyclesCompleted
    };
    await redis.set(key, nextState);
    return { selected, shouldRefresh };
  } catch {
    /* no-op */
  }

  return { selected, shouldRefresh: false };
}

export async function peekNextCommunityCategories(
  redis: Redis | null,
  userId: string,
  count: number
): Promise<CommunityCategoryKey[]> {
  if (!redis) {
    return [];
  }
  try {
    const cached = await redis.get<
      CommunityCategoryCycleState | CommunityCategoryKey[]
    >(getCommunityCategoryCycleKey(userId));
    if (Array.isArray(cached)) {
      return cached.slice(0, count);
    }
    if (cached && Array.isArray(cached.remaining)) {
      return cached.remaining.slice(0, count);
    }
  } catch {
    /* no-op */
  }
  return [];
}
