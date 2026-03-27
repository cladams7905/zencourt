"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Clapperboard } from "lucide-react";
import type { ListingClipVersionItem } from "@web/src/components/listings/create/shared/types";
import { Button } from "@web/src/components/ui/button";
import {
  resetListingClipRegenerationStoreForTests,
  getLatestAttemptVersion,
  getRegeneratingVersion,
  isClipRegenerating,
  useListingClipManagerWorkspace
} from "@web/src/components/listings/create/domain/listingClipManager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@web/src/components/ui/alert-dialog";
import {
  ListingClipManagerActionControls,
  ListingClipManagerClipList,
  ListingClipManagerDesktopDetail,
  ListingClipManagerVideoPlayer
} from "@web/src/components/listings/create/components/ListingClipManagerWorkspaceParts";

type ListingClipManagerProps = {
  listingId: string;
  items: ListingClipVersionItem[];
  mode?: "card" | "workspace";
};

export function resetListingClipManagerOptimisticStateForTests() {
  resetListingClipRegenerationStoreForTests();
}

function getDisplayThumbnail(item?: ListingClipVersionItem | null) {
  if (!item) {
    return null;
  }

  if (isClipRegenerating(getRegeneratingVersion(item)?.versionStatus)) {
    return item.currentVersion.thumbnail ?? item.versions[0]?.thumbnail ?? null;
  }

  return item.currentVersion.thumbnail ?? null;
}

function getDisplayDuration(item?: ListingClipVersionItem | null) {
  if (!item) {
    return null;
  }

  const latestAttemptVersion = getLatestAttemptVersion(item);
  if (isClipRegenerating(latestAttemptVersion?.versionStatus)) {
    return (
      latestAttemptVersion?.durationSeconds ??
      item.currentVersion.durationSeconds ??
      item.versions[0]?.durationSeconds ??
      null
    );
  }

  return (
    latestAttemptVersion?.durationSeconds ??
    item.currentVersion.durationSeconds ??
    null
  );
}

function formatDuration(durationSeconds?: number | null) {
  if (!durationSeconds) return "Duration unavailable";
  return `${durationSeconds}s`;
}

function formatGeneratedAt(value?: string | Date | null) {
  if (!value) {
    return "Generated date unavailable";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Generated date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function buildClipsHref(listingId: string, search: string) {
  const query = search ? `?${search}` : "";
  return `/listings/${listingId}/create/clips${query}`;
}

function ClipManagerCard({
  listingId,
  items
}: Pick<ListingClipManagerProps, "listingId" | "items">) {
  const searchParams = useSearchParams();

  return (
    <Link
      href={buildClipsHref(listingId, searchParams.toString())}
      className="block w-full rounded-2xl border border-border bg-card p-4 text-left shadow-xs transition-colors hover:border-foreground/20 lg:max-w-md"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="inline-flex min-w-0 items-center gap-1 self-center text-sm font-semibold text-foreground">
            View Room by Room Generated Clips
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
          </p>
          <div className="inline-flex h-7 w-22 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            <Clapperboard className="h-3.5 w-3.5 shrink-0" />
            {items.length} clips
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            Open the clip manager to review, download, and regenerate individual
            video clips.
          </p>
        </div>
      </div>
    </Link>
  );
}

function ClipManagerWorkspace({
  listingId,
  items
}: Pick<ListingClipManagerProps, "listingId" | "items">) {
  const {
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
  } = useListingClipManagerWorkspace({ listingId, items });

  if (!clipItems.length) {
    return (
      <div className="rounded-2xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">
        No generated clips are available yet.
      </div>
    );
  }

  const selectedActionControlsProps = {
    selectedVersionId: selectedVersion?.clipVersionId,
    versions: selectedItem?.versions ?? [],
    selectedVersionHasVideo: Boolean(selectedVersion?.videoUrl),
    selectedClipIsRegenerating,
    selectedClipBatchId,
    isSubmitting,
    isSelectingVersion,
    isCanceling,
    hasSelectedItem: Boolean(selectedItem),
    isRegenerateMenuOpen,
    isCustomizeExpanded,
    draftAiDirections,
    onVersionChange: handleSelectVersion,
    onDownload: handleDownloadClip,
    onCancel: () => setIsCancelDialogOpen(true),
    onRegenerateMenuOpenChange: handleRegenerateMenuOpenChange,
    onQuickRegenerate: handleQuickRegenerate,
    onOpenCustomize: handleOpenCustomize,
    onBackToQuickActions: handleBackToQuickActions,
    onDraftAiDirectionsChange: setDraftAiDirections,
    onSubmitCustomizedRegeneration: handleSubmitCustomizedRegeneration,
    formatGeneratedAt
  };

  return (
    <div className="grid min-h-[max(640px,calc(100vh-220px))] gap-6 overflow-x-hidden overflow-y-auto max-lg:grid-rows-[auto_auto] lg:grid-cols-[300px_minmax(0,1fr)]">
      <ListingClipManagerClipList
        clipItems={clipItems}
        selectedClipId={selectedItem?.clipId}
        isDesktopLayout={isDesktopLayout}
        onSelectClip={handleSelectClip}
        getItemThumbnail={getDisplayThumbnail}
        getItemDuration={getDisplayDuration}
        isItemRegenerating={isItemRegenerating}
        formatDuration={formatDuration}
        formatGeneratedAt={formatGeneratedAt}
        renderSelectedMobileDetail={() => (
          <>
            <ListingClipManagerActionControls
              {...selectedActionControlsProps}
              controlsClassName="items-end"
              textareaIdSuffix="mobile"
            />
            <ListingClipManagerVideoPlayer
              videoUrl={selectedVersion?.videoUrl}
              posterUrl={selectedDisplayThumbnail}
            />
          </>
        )}
      />

      {isDesktopLayout ? (
        <ListingClipManagerDesktopDetail
          roomName={selectedItem?.roomName}
          generatedAtLabel={
            selectedClipIsRegenerating
              ? "Regenerating now"
              : formatGeneratedAt(selectedVersion?.generatedAt)
          }
          durationLabel={formatDuration(selectedVersion?.durationSeconds)}
          isRegenerating={selectedClipIsRegenerating}
          actions={
            <ListingClipManagerActionControls
              {...selectedActionControlsProps}
              selectClassName="lg:max-w-[280px]"
              textareaIdSuffix="desktop"
            />
          }
          player={
            <ListingClipManagerVideoPlayer
              videoUrl={selectedVersion?.videoUrl}
              posterUrl={selectedDisplayThumbnail}
            />
          }
        />
      ) : null}
      <AlertDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel clip generation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop the active generation batch for this clip. You can
              start a new regeneration later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCanceling}>
              Keep running
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={isCanceling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCanceling ? "Canceling..." : "Cancel generation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function ListingClipManager({
  listingId,
  items,
  mode = "card"
}: ListingClipManagerProps) {
  if (mode === "workspace") {
    return <ClipManagerWorkspace listingId={listingId} items={items} />;
  }

  if (!items.length) {
    return null;
  }

  return <ClipManagerCard listingId={listingId} items={items} />;
}

export function ListingClipManagerBackButton({ href }: { href: string }) {
  return (
    <Button
      asChild
      variant="outline"
      className="w-fit shrink-0 gap-2 self-start"
    >
      <Link href={href}>
        <ChevronLeft className="h-4 w-4" />
        Back to create
      </Link>
    </Button>
  );
}
