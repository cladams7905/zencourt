import type { ListingClipVersionItem } from "@web/src/components/listings/create/shared/types";

export type OptimisticClipRegeneration = {
  fallbackItem: ListingClipVersionItem;
  inFlightVersion: ListingClipVersionItem["inFlightVersion"];
  batchId?: string;
  canceled?: boolean;
};

const optimisticClipRegenerationStore = new Map<
  string,
  Record<string, OptimisticClipRegeneration>
>();

export function resetListingClipRegenerationStoreForTests() {
  optimisticClipRegenerationStore.clear();
}

export function isClipRegenerating(status?: string | null) {
  return ["pending", "processing"].includes(status ?? "");
}

export function getRegeneratingVersion(item?: ListingClipVersionItem | null) {
  if (!item) {
    return null;
  }

  if (isClipRegenerating(item.currentVersion.versionStatus)) {
    return item.currentVersion;
  }

  if (isClipRegenerating(item.inFlightVersion?.versionStatus)) {
    return item.inFlightVersion;
  }

  return null;
}

export function getLatestAttemptVersion(item?: ListingClipVersionItem | null) {
  return item?.inFlightVersion ?? item?.currentVersion ?? null;
}

export function mergeClipItems(nextItems: ListingClipVersionItem[]) {
  return nextItems.map((item) => ({
    ...item,
    versions: [...item.versions].sort(
      (a, b) => (b.versionNumber ?? 0) - (a.versionNumber ?? 0)
    )
  }));
}

export function buildCompletedFallbackItem(
  item: ListingClipVersionItem,
  optimistic?: OptimisticClipRegeneration
) {
  const fallbackCurrentVersion =
    optimistic?.fallbackItem.currentVersion ??
    (isClipRegenerating(item.currentVersion.versionStatus)
      ? (item.versions[0] ?? item.currentVersion)
      : item.currentVersion);

  return {
    ...item,
    currentVersion: fallbackCurrentVersion,
    inFlightVersion: null
  };
}

export function getOptimisticClipRegenerations(listingId: string) {
  return optimisticClipRegenerationStore.get(listingId) ?? {};
}

export function setOptimisticClipRegeneration(
  listingId: string,
  clipId: string,
  value: OptimisticClipRegeneration | null
) {
  const current = getOptimisticClipRegenerations(listingId);

  if (!value) {
    if (!current[clipId]) {
      return;
    }

    const next = { ...current };
    delete next[clipId];

    if (Object.keys(next).length === 0) {
      optimisticClipRegenerationStore.delete(listingId);
      return;
    }

    optimisticClipRegenerationStore.set(listingId, next);
    return;
  }

  optimisticClipRegenerationStore.set(listingId, {
    ...current,
    [clipId]: value
  });
}

export function getOptimisticClipRegeneration(
  listingId: string,
  clipId: string
) {
  return getOptimisticClipRegenerations(listingId)[clipId] ?? null;
}

export function buildPendingBatchState(listingId: string) {
  return Object.fromEntries(
    Object.entries(getOptimisticClipRegenerations(listingId))
      .filter(([, value]) => Boolean(value.batchId))
      .map(([clipId, value]) => [clipId, value.batchId as string])
  );
}

export function buildCanceledClipIdsState(listingId: string) {
  return new Set(
    Object.entries(getOptimisticClipRegenerations(listingId))
      .filter(([, value]) => value.canceled)
      .map(([clipId]) => clipId)
  );
}

export function applyOptimisticClipRegenerations(
  listingId: string,
  nextItems: ListingClipVersionItem[]
) {
  const optimisticByClipId = getOptimisticClipRegenerations(listingId);

  return mergeClipItems(nextItems).map((item) => {
    const optimistic = optimisticByClipId[item.clipId];
    if (!optimistic) {
      return item;
    }

    const latestAttemptVersion = getLatestAttemptVersion(item);
    const rawStatus =
      latestAttemptVersion?.versionStatus ??
      item.currentVersion.versionStatus ??
      "";
    const latestAttemptVersionId = latestAttemptVersion?.clipVersionId ?? null;
    const optimisticVersionId = optimistic.inFlightVersion?.clipVersionId ?? null;

    if (optimistic.batchId) {
      if (
        optimisticVersionId &&
        latestAttemptVersionId === optimisticVersionId
      ) {
        return item;
      }

      return {
        ...item,
        currentVersion: optimistic.fallbackItem.currentVersion,
        inFlightVersion: optimistic.inFlightVersion
      };
    }

    if (
      optimistic.canceled &&
      ["pending", "processing"].includes(rawStatus) &&
      latestAttemptVersionId !== optimistic.fallbackItem.currentVersion.clipVersionId
    ) {
      return optimistic.fallbackItem;
    }

    return item;
  });
}

export function isLocallyCanceledClip(params: {
  clipId: string;
  canceledClipIds: Set<string>;
  pendingBatchIdByClipId: Record<string, string>;
}) {
  return (
    params.canceledClipIds.has(params.clipId) &&
    !params.pendingBatchIdByClipId[params.clipId]
  );
}

export function hasActiveClipRegenerationPoll(params: {
  items: ListingClipVersionItem[];
  canceledClipIds: Set<string>;
  pendingBatchIdByClipId: Record<string, string>;
}) {
  return params.items.some(
    (item) =>
      !isLocallyCanceledClip({
        clipId: item.clipId,
        canceledClipIds: params.canceledClipIds,
        pendingBatchIdByClipId: params.pendingBatchIdByClipId
      }) && isClipRegenerating(getRegeneratingVersion(item)?.versionStatus)
  );
}
