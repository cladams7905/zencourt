"use client";

import * as React from "react";
import type { ListingClipVersionItem } from "@web/src/components/listings/create/shared/types";
import {
  applyOptimisticClipRegenerations,
  buildCanceledClipIdsState,
  buildPendingBatchState,
  getRegeneratingVersion,
  isClipRegenerating,
  isLocallyCanceledClip
} from "./regenerationState";
import {
  getDisplayThumbnail,
  serializeClipItems,
  useIsDesktopLayout
} from "./helpers";
import { useListingClipManagerWorkspaceActions } from "./actions";
import { useListingClipManagerWorkspaceSync } from "./sync";

type UseListingClipManagerWorkspaceParams = {
  listingId: string;
  items: ListingClipVersionItem[];
};

export function useListingClipManagerWorkspace({
  listingId,
  items
}: UseListingClipManagerWorkspaceParams) {
  const isDesktopLayout = useIsDesktopLayout();
  const [clipItems, setClipItems] = React.useState(() =>
    applyOptimisticClipRegenerations(listingId, items)
  );
  const [selectedClipId, setSelectedClipId] = React.useState<string | null>(
    items[0]?.clipId ?? null
  );
  const [selectedVersionId, setSelectedVersionId] = React.useState<
    string | null
  >(() => items[0]?.currentVersion.clipVersionId ?? null);
  const [draftAiDirections, setDraftAiDirections] = React.useState("");
  const [isRegenerateMenuOpen, setIsRegenerateMenuOpen] = React.useState(false);
  const [isCustomizeExpanded, setIsCustomizeExpanded] = React.useState(false);
  const [isSubmitting, startTransition] = React.useTransition();
  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);
  const [isCanceling, startCancelTransition] = React.useTransition();
  const [timedOutClipIds, setTimedOutClipIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [canceledClipIds, setCanceledClipIds] = React.useState<Set<string>>(
    () => buildCanceledClipIdsState(listingId)
  );
  const [pendingBatchIdByClipId, setPendingBatchIdByClipId] = React.useState<
    Record<string, string>
  >(() => buildPendingBatchState(listingId));
  const [isSelectingVersion, startSelectVersionTransition] =
    React.useTransition();
  const previousStatusesRef = React.useRef<Map<string, string>>(new Map());
  const previousDraftSelectionRef = React.useRef<{
    clipId: string | null;
    versionId: string | null;
  } | null>(null);
  const lastSignatureRef = React.useRef(serializeClipItems(clipItems));

  useListingClipManagerWorkspaceSync({
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
  });

  const selectedItem =
    clipItems.find((item) => item.clipId === selectedClipId) ?? clipItems[0];
  const selectedVersion =
    selectedItem?.versions.find(
      (version) => version.clipVersionId === selectedVersionId
    ) ?? selectedItem?.currentVersion;
  const selectedRegeneratingVersion = getRegeneratingVersion(selectedItem);
  const selectedDisplayThumbnail = getDisplayThumbnail(selectedItem);
  const selectedClipIsRegenerating =
    !selectedItem ||
    isLocallyCanceledClip({
      clipId: selectedItem.clipId,
      canceledClipIds,
      pendingBatchIdByClipId
    })
      ? false
      : isClipRegenerating(selectedRegeneratingVersion?.versionStatus);
  const selectedClipBatchId = selectedItem
    ? pendingBatchIdByClipId[selectedItem.clipId]
    : undefined;

  const {
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
  } = useListingClipManagerWorkspaceActions({
    listingId,
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
  });

  return {
    clipItems,
    draftAiDirections,
    isCancelDialogOpen,
    isCanceling,
    isCustomizeExpanded,
    isDesktopLayout,
    isItemRegenerating,
    isRegenerateMenuOpen,
    isSelectingVersion,
    isSubmitting,
    selectedClipBatchId,
    selectedClipIsRegenerating,
    selectedDisplayThumbnail,
    selectedItem,
    selectedVersion,
    setDraftAiDirections,
    setIsCancelDialogOpen,
    handleBackToQuickActions,
    handleConfirmCancel,
    handleDownloadClip,
    handleOpenCustomize,
    handleQuickRegenerate,
    handleRegenerateMenuOpenChange,
    handleSelectClip,
    handleSelectVersion,
    handleSubmitCustomizedRegeneration
  };
}
