"use client";

import * as React from "react";
import useSWR from "swr";
import { toast } from "sonner";
import type { ListingClipVersionItem } from "@web/src/components/listings/create/shared/types";
import { fetchApiData } from "@web/src/lib/core/http/client";
import {
  getClipRegenerationSoftTimeoutMs,
  isPastTimeout,
  VIDEO_GENERATION_TIMEOUT_MESSAGE
} from "@web/src/lib/domain/listing/videoGenerationTimeouts";
import {
  applyOptimisticClipRegenerations,
  getLatestAttemptVersion,
  getOptimisticClipRegenerations,
  getRegeneratingVersion,
  hasActiveClipRegenerationPoll,
  isClipRegenerating,
  isLocallyCanceledClip,
  mergeClipItems,
  setOptimisticClipRegeneration
} from "./regenerationState";
import { serializeClipItems } from "./helpers";

type UseListingClipManagerWorkspaceSyncParams = {
  listingId: string;
  items: ListingClipVersionItem[];
  clipItems: ListingClipVersionItem[];
  selectedClipId: string | null;
  selectedVersionId: string | null;
  draftAiDirections: string;
  timedOutClipIds: Set<string>;
  canceledClipIds: Set<string>;
  pendingBatchIdByClipId: Record<string, string>;
  previousStatusesRef: React.MutableRefObject<Map<string, string>>;
  previousDraftSelectionRef: React.MutableRefObject<{
    clipId: string | null;
    versionId: string | null;
  } | null>;
  lastSignatureRef: React.MutableRefObject<string>;
  setClipItems: React.Dispatch<React.SetStateAction<ListingClipVersionItem[]>>;
  setSelectedClipId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedVersionId: React.Dispatch<React.SetStateAction<string | null>>;
  setDraftAiDirections: React.Dispatch<React.SetStateAction<string>>;
  setTimedOutClipIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setCanceledClipIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingBatchIdByClipId: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
};

export function useListingClipManagerWorkspaceSync({
  listingId,
  items,
  clipItems,
  selectedClipId,
  selectedVersionId,
  draftAiDirections,
  timedOutClipIds,
  canceledClipIds,
  pendingBatchIdByClipId,
  previousStatusesRef,
  previousDraftSelectionRef,
  lastSignatureRef,
  setClipItems,
  setSelectedClipId,
  setSelectedVersionId,
  setDraftAiDirections,
  setTimedOutClipIds,
  setCanceledClipIds,
  setPendingBatchIdByClipId
}: UseListingClipManagerWorkspaceSyncParams) {
  React.useEffect(() => {
    const normalized = applyOptimisticClipRegenerations(listingId, items);
    const nextSignature = serializeClipItems(normalized);
    if (nextSignature === lastSignatureRef.current) {
      return;
    }

    lastSignatureRef.current = nextSignature;
    setClipItems(normalized);
  }, [items, lastSignatureRef, listingId, setClipItems]);

  const hasActivePollableItems = React.useMemo(
    () =>
      hasActiveClipRegenerationPoll({
        items: clipItems,
        canceledClipIds,
        pendingBatchIdByClipId
      }),
    [canceledClipIds, clipItems, pendingBatchIdByClipId]
  );

  const { data } = useSWR(
    `/api/v1/listings/${listingId}/clip-versions`,
    (url: string) =>
      fetchApiData<{ clipVersionItems: ListingClipVersionItem[] }>(
        url,
        undefined,
        "Failed to load clip versions."
      ),
    {
      refreshInterval: hasActivePollableItems ? 2000 : 0,
      revalidateOnFocus: false
    }
  );

  React.useEffect(() => {
    const nextItems = data?.clipVersionItems;
    if (!nextItems?.length) {
      return;
    }

    const rawServerItems = mergeClipItems(nextItems);
    const rawStatusByClipId = new Map(
      rawServerItems.map((item) => {
        const latestAttemptVersion = getLatestAttemptVersion(item);
        return [
          item.clipId,
          latestAttemptVersion?.versionStatus ??
            item.currentVersion.versionStatus ??
            ""
        ] as const;
      })
    );
    const rawNormalized = applyOptimisticClipRegenerations(listingId, nextItems);
    const localItemsByClipId = new Map(
      clipItems.map((item) => [item.clipId, item] as const)
    );
    const optimisticClipRegenerations = getOptimisticClipRegenerations(listingId);
    const nextStatuses = new Map<string, string>();
    const nextCanceledClipIds = new Set(canceledClipIds);
    let didCanceledClipIdsChange = false;
    const normalized = rawNormalized.map((item) => {
      const rawStatus = rawStatusByClipId.get(item.clipId) ?? "";
      const localItem = localItemsByClipId.get(item.clipId);
      const canceledFallbackItem = optimisticClipRegenerations[item.clipId]
        ?.canceled
        ? optimisticClipRegenerations[item.clipId]?.fallbackItem
        : localItem;
      const shouldIgnoreStaleProcessing =
        canceledClipIds.has(item.clipId) &&
        !pendingBatchIdByClipId[item.clipId] &&
        ["pending", "processing"].includes(rawStatus) &&
        canceledFallbackItem;

      if (
        canceledClipIds.has(item.clipId) &&
        !["pending", "processing"].includes(rawStatus)
      ) {
        nextCanceledClipIds.delete(item.clipId);
        didCanceledClipIdsChange = true;
      }

      return shouldIgnoreStaleProcessing ? canceledFallbackItem : item;
    });

    for (const item of normalized) {
      const latestAttemptVersion = getLatestAttemptVersion(item);
      const status =
        latestAttemptVersion?.versionStatus ??
        item.currentVersion.versionStatus ??
        "";
      nextStatuses.set(item.clipId, status);
      const previousStatus = previousStatusesRef.current.get(item.clipId);

      if (previousStatus && previousStatus !== status) {
        if (
          ["pending", "processing"].includes(previousStatus) &&
          status === "completed"
        ) {
          setOptimisticClipRegeneration(listingId, item.clipId, null);
          setPendingBatchIdByClipId((currentPendingBatchIdByClipId) => {
            const nextPendingBatchIdByClipId = {
              ...currentPendingBatchIdByClipId
            };
            delete nextPendingBatchIdByClipId[item.clipId];
            return nextPendingBatchIdByClipId;
          });
          toast.success(`${item.roomName} clip regenerated.`);
          setSelectedClipId(item.clipId);
          setSelectedVersionId(item.currentVersion.clipVersionId ?? null);
        } else if (
          ["pending", "processing"].includes(previousStatus) &&
          status === "failed"
        ) {
          setOptimisticClipRegeneration(listingId, item.clipId, null);
          setPendingBatchIdByClipId((currentPendingBatchIdByClipId) => {
            const nextPendingBatchIdByClipId = {
              ...currentPendingBatchIdByClipId
            };
            delete nextPendingBatchIdByClipId[item.clipId];
            return nextPendingBatchIdByClipId;
          });
          toast.error(`Failed to regenerate ${item.roomName} clip.`);
        }
      }
    }

    previousStatusesRef.current = nextStatuses;
    if (didCanceledClipIdsChange) {
      for (const clipId of canceledClipIds) {
        if (!nextCanceledClipIds.has(clipId)) {
          setOptimisticClipRegeneration(listingId, clipId, null);
        }
      }
      setCanceledClipIds(nextCanceledClipIds);
    }

    const nextSignature = serializeClipItems(normalized);
    if (nextSignature !== lastSignatureRef.current) {
      lastSignatureRef.current = nextSignature;
      setClipItems(normalized);
    }
  }, [
    canceledClipIds,
    clipItems,
    data,
    lastSignatureRef,
    listingId,
    pendingBatchIdByClipId,
    previousStatusesRef,
    setCanceledClipIds,
    setClipItems,
    setPendingBatchIdByClipId,
    setSelectedClipId,
    setSelectedVersionId
  ]);

  React.useEffect(() => {
    const nextTimedOutClipIds = new Set(timedOutClipIds);
    let didChange = false;

    for (const item of clipItems) {
      if (
        isLocallyCanceledClip({
          clipId: item.clipId,
          canceledClipIds,
          pendingBatchIdByClipId
        })
      ) {
        if (nextTimedOutClipIds.delete(item.clipId)) {
          didChange = true;
        }
        continue;
      }

      const regeneratingVersion = getRegeneratingVersion(item);
      const isRegenerating = isClipRegenerating(
        regeneratingVersion?.versionStatus
      );

      if (!isRegenerating) {
        if (nextTimedOutClipIds.delete(item.clipId)) {
          didChange = true;
        }
        continue;
      }

      if (
        !nextTimedOutClipIds.has(item.clipId) &&
        isPastTimeout(
          regeneratingVersion?.generatedAt,
          getClipRegenerationSoftTimeoutMs()
        )
      ) {
        nextTimedOutClipIds.add(item.clipId);
        didChange = true;
        toast.error(VIDEO_GENERATION_TIMEOUT_MESSAGE);
      }
    }

    if (didChange) {
      setTimedOutClipIds(nextTimedOutClipIds);
    }
  }, [
    canceledClipIds,
    clipItems,
    pendingBatchIdByClipId,
    setTimedOutClipIds,
    timedOutClipIds
  ]);

  React.useEffect(() => {
    if (!clipItems.length) {
      if (selectedClipId !== null) {
        setSelectedClipId(null);
      }
      if (selectedVersionId !== null) {
        setSelectedVersionId(null);
      }
      if (draftAiDirections !== "") {
        setDraftAiDirections("");
      }
      return;
    }

    const nextSelectedItem =
      clipItems.find((item) => item.clipId === selectedClipId) ?? clipItems[0];
    if (!nextSelectedItem) {
      return;
    }

    if (nextSelectedItem.clipId !== selectedClipId) {
      setSelectedClipId(nextSelectedItem.clipId);
    }

    const nextSelectedVersion =
      nextSelectedItem.versions.find(
        (version) => version.clipVersionId === selectedVersionId
      ) ?? nextSelectedItem.currentVersion;
    const nextSelectedVersionId = nextSelectedVersion.clipVersionId ?? null;
    if (nextSelectedVersionId !== selectedVersionId) {
      setSelectedVersionId(nextSelectedVersionId);
    }

    const previousDraftSelection = previousDraftSelectionRef.current;
    const didSelectionChange =
      previousDraftSelection?.clipId !== nextSelectedItem.clipId ||
      previousDraftSelection?.versionId !== nextSelectedVersionId;

    if (didSelectionChange) {
      setDraftAiDirections(nextSelectedItem.currentVersion.aiDirections ?? "");
    }

    previousDraftSelectionRef.current = {
      clipId: nextSelectedItem.clipId,
      versionId: nextSelectedVersionId
    };
  }, [
    clipItems,
    draftAiDirections,
    previousDraftSelectionRef,
    selectedClipId,
    selectedVersionId,
    setDraftAiDirections,
    setSelectedClipId,
    setSelectedVersionId
  ]);
}
