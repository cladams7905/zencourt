"use client";

import * as React from "react";
import { toast } from "sonner";
import type { ListingClipVersionItem } from "@web/src/components/listings/create/shared/types";
import {
  cancelVideoGenerationBatch,
  regenerateListingClipVersion,
  selectListingClipVersion
} from "@web/src/server/actions/video/generate";
import {
  buildCompletedFallbackItem,
  getOptimisticClipRegeneration,
  getRegeneratingVersion,
  isClipRegenerating,
  isLocallyCanceledClip,
  setOptimisticClipRegeneration
} from "./regenerationState";
import { buildClipDownloadHref } from "./helpers";

type UseListingClipManagerWorkspaceActionsParams = {
  listingId: string;
  clipItems: ListingClipVersionItem[];
  selectedItem?: ListingClipVersionItem;
  selectedVersion?: ListingClipVersionItem["currentVersion"];
  selectedClipBatchId?: string;
  selectedVersionId: string | null;
  draftAiDirections: string;
  canceledClipIds: Set<string>;
  pendingBatchIdByClipId: Record<string, string>;
  startTransition: React.TransitionStartFunction;
  startCancelTransition: React.TransitionStartFunction;
  startSelectVersionTransition: React.TransitionStartFunction;
  setClipItems: React.Dispatch<React.SetStateAction<ListingClipVersionItem[]>>;
  setSelectedClipId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedVersionId: React.Dispatch<React.SetStateAction<string | null>>;
  setDraftAiDirections: React.Dispatch<React.SetStateAction<string>>;
  setIsRegenerateMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCustomizeExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCancelDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setTimedOutClipIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setCanceledClipIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingBatchIdByClipId: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
};

export function useListingClipManagerWorkspaceActions({
  listingId,
  clipItems,
  selectedItem,
  selectedVersion,
  selectedClipBatchId,
  selectedVersionId,
  draftAiDirections,
  canceledClipIds,
  pendingBatchIdByClipId,
  startTransition,
  startCancelTransition,
  startSelectVersionTransition,
  setClipItems,
  setSelectedClipId,
  setSelectedVersionId,
  setDraftAiDirections,
  setIsRegenerateMenuOpen,
  setIsCustomizeExpanded,
  setIsCancelDialogOpen,
  setTimedOutClipIds,
  setCanceledClipIds,
  setPendingBatchIdByClipId
}: UseListingClipManagerWorkspaceActionsParams) {
  const submitRegeneration = React.useCallback(
    (aiDirections: string) => {
      if (!selectedItem) {
        return;
      }

      startTransition(() => {
        void regenerateListingClipVersion({
          listingId,
          clipId: selectedItem.clipId,
          aiDirections
        })
          .then((result) => {
            const optimisticInFlightVersion = {
              ...selectedItem.currentVersion,
              clipVersionId: result.clipVersionId,
              aiDirections,
              generatedAt: new Date().toISOString(),
              versionStatus: "processing" as const
            };
            setOptimisticClipRegeneration(listingId, selectedItem.clipId, {
              fallbackItem: {
                ...selectedItem,
                inFlightVersion: null
              },
              inFlightVersion: optimisticInFlightVersion,
              batchId: result.batchId
            });
            setClipItems((currentItems) =>
              currentItems.map((item) =>
                item.clipId === selectedItem.clipId
                  ? {
                      ...item,
                      inFlightVersion: optimisticInFlightVersion
                    }
                  : item
              )
            );
            setCanceledClipIds((currentCanceledClipIds) => {
              const nextCanceledClipIds = new Set(currentCanceledClipIds);
              nextCanceledClipIds.delete(selectedItem.clipId);
              return nextCanceledClipIds;
            });
            setPendingBatchIdByClipId((currentPendingBatchIdByClipId) => ({
              ...currentPendingBatchIdByClipId,
              [selectedItem.clipId]: result.batchId
            }));
            setTimedOutClipIds((currentTimedOutClipIds) => {
              const nextTimedOutClipIds = new Set(currentTimedOutClipIds);
              nextTimedOutClipIds.delete(selectedItem.clipId);
              return nextTimedOutClipIds;
            });
            setIsRegenerateMenuOpen(false);
            setIsCustomizeExpanded(false);
            toast.success(`Started regenerating ${selectedItem.roomName} clip.`);
          })
          .catch((error) => {
            toast.error(
              error instanceof Error
                ? error.message
                : "Failed to regenerate clip."
            );
          });
      });
    },
    [
      listingId,
      selectedItem,
      setCanceledClipIds,
      setClipItems,
      setIsCustomizeExpanded,
      setIsRegenerateMenuOpen,
      setPendingBatchIdByClipId,
      setTimedOutClipIds,
      startTransition
    ]
  );

  const handleQuickRegenerate = React.useCallback(() => {
    const savedAiDirections = selectedItem?.currentVersion.aiDirections ?? "";
    setDraftAiDirections(savedAiDirections);
    submitRegeneration(savedAiDirections);
  }, [selectedItem, setDraftAiDirections, submitRegeneration]);

  const handleOpenCustomize = React.useCallback(() => {
    setDraftAiDirections(selectedItem?.currentVersion.aiDirections ?? "");
    setIsCustomizeExpanded(true);
  }, [selectedItem, setDraftAiDirections, setIsCustomizeExpanded]);

  const handleBackToQuickActions = React.useCallback(() => {
    setIsCustomizeExpanded(false);
  }, [setIsCustomizeExpanded]);

  const handleRegenerateMenuOpenChange = React.useCallback(
    (open: boolean) => {
      setIsRegenerateMenuOpen(open);
      if (!open) {
        setIsCustomizeExpanded(false);
      }
    },
    [setIsCustomizeExpanded, setIsRegenerateMenuOpen]
  );

  const handleSubmitCustomizedRegeneration = React.useCallback(() => {
    submitRegeneration(draftAiDirections);
  }, [draftAiDirections, submitRegeneration]);

  const handleDownloadClip = React.useCallback(async () => {
    const clipVersionId = selectedVersion?.clipVersionId;
    if (!clipVersionId) {
      toast.error("No clip available to download.");
      return;
    }

    try {
      const link = document.createElement("a");
      link.href = buildClipDownloadHref(listingId, clipVersionId);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to download clip."
      );
    }
  }, [listingId, selectedVersion?.clipVersionId]);

  const handleConfirmCancel = React.useCallback(() => {
    if (!selectedItem || !selectedClipBatchId) {
      return;
    }

    startCancelTransition(() => {
      void cancelVideoGenerationBatch(selectedClipBatchId, "Canceled by user")
        .then(() => {
          const fallbackItem = buildCompletedFallbackItem(
            selectedItem,
            getOptimisticClipRegeneration(listingId, selectedItem.clipId) ??
              undefined
          );
          setOptimisticClipRegeneration(listingId, selectedItem.clipId, {
            fallbackItem,
            inFlightVersion: null,
            canceled: true
          });
          setPendingBatchIdByClipId((currentPendingBatchIdByClipId) => {
            const nextPendingBatchIdByClipId = {
              ...currentPendingBatchIdByClipId
            };
            delete nextPendingBatchIdByClipId[selectedItem.clipId];
            return nextPendingBatchIdByClipId;
          });
          setClipItems((currentItems) =>
            currentItems.map((item) =>
              item.clipId === selectedItem.clipId ? { ...fallbackItem } : item
            )
          );
          setCanceledClipIds((currentCanceledClipIds) => {
            const nextCanceledClipIds = new Set(currentCanceledClipIds);
            nextCanceledClipIds.add(selectedItem.clipId);
            return nextCanceledClipIds;
          });
          setIsCancelDialogOpen(false);
          toast.success(`Canceled ${selectedItem.roomName} clip generation.`);
        })
        .catch((error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to cancel clip generation."
          );
        });
    });
  }, [
    listingId,
    selectedClipBatchId,
    selectedItem,
    setCanceledClipIds,
    setClipItems,
    setIsCancelDialogOpen,
    setPendingBatchIdByClipId,
    startCancelTransition
  ]);

  const applySelectedVersionLocally = React.useCallback(
    (clipId: string, clipVersionId: string) => {
      setClipItems((currentItems) =>
        currentItems.map((item) => {
          if (item.clipId !== clipId) {
            return item;
          }

          const nextCurrentVersion =
            item.versions.find(
              (version) => version.clipVersionId === clipVersionId
            ) ?? item.currentVersion;

          return {
            ...item,
            currentVersion: nextCurrentVersion
          };
        })
      );
    },
    [setClipItems]
  );

  const handleSelectVersion = React.useCallback(
    (clipVersionId: string) => {
      if (!selectedItem) {
        return;
      }

      const previousVersionId = selectedVersionId;
      setSelectedVersionId(clipVersionId);

      startSelectVersionTransition(() => {
        void selectListingClipVersion({
          listingId,
          clipId: selectedItem.clipId,
          clipVersionId
        })
          .then(() => {
            applySelectedVersionLocally(selectedItem.clipId, clipVersionId);
          })
          .catch((error) => {
            setSelectedVersionId(previousVersionId ?? null);
            toast.error(
              error instanceof Error
                ? error.message
                : "Failed to select clip version."
            );
          });
      });
    },
    [
      applySelectedVersionLocally,
      listingId,
      selectedItem,
      selectedVersionId,
      setSelectedVersionId,
      startSelectVersionTransition
    ]
  );

  const handleSelectClip = React.useCallback(
    (item: ListingClipVersionItem) => {
      setSelectedClipId(item.clipId);
      setSelectedVersionId(item.currentVersion.clipVersionId ?? null);
    },
    [setSelectedClipId, setSelectedVersionId]
  );

  const isItemRegenerating = React.useCallback(
    (item: ListingClipVersionItem) =>
      isLocallyCanceledClip({
        clipId: item.clipId,
        canceledClipIds,
        pendingBatchIdByClipId
      })
        ? false
        : isClipRegenerating(getRegeneratingVersion(item)?.versionStatus),
    [canceledClipIds, pendingBatchIdByClipId]
  );

  return {
    handleBackToQuickActions,
    handleConfirmCancel,
    handleDownloadClip,
    handleOpenCustomize,
    handleQuickRegenerate,
    handleRegenerateMenuOpenChange,
    handleSelectClip,
    handleSelectVersion,
    handleSubmitCustomizedRegeneration,
    isItemRegenerating
  };
}
