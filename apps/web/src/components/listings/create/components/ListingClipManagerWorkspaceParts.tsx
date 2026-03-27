"use client";

import * as React from "react";
import { CalendarClock, Download, Loader2, RefreshCw } from "lucide-react";
import type { ListingClipVersionItem } from "@web/src/components/listings/create/shared/types";
import { Button } from "@web/src/components/ui/button";
import { LoadingImage } from "@web/src/components/ui/loading-image";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@web/src/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@web/src/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@web/src/components/ui/tooltip";
import { cn } from "@web/src/components/ui/utils";

function RegenerationSpinner({ label }: { label: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className="inline-flex items-center justify-center text-white/85"
    >
      <Loader2 className="h-4 w-4 animate-spin" />
    </span>
  );
}

export function ListingClipManagerVideoPlayer({
  videoUrl,
  posterUrl
}: {
  videoUrl?: string | null;
  posterUrl?: string | null;
}) {
  return (
    <div className="flex min-h-0 min-w-0 justify-center max-lg:min-h-[min(52dvh,26rem)] lg:h-full">
      <div
        data-testid="clip-preview-viewport"
        className={cn(
          "relative aspect-9/16 w-full max-w-60 overflow-hidden rounded-xl bg-card shadow-sm",
          "lg:h-full lg:min-h-0 lg:w-auto lg:max-w-full"
        )}
      >
        {videoUrl ? (
          <video
            key={videoUrl}
            src={videoUrl}
            poster={posterUrl ?? undefined}
            controls
            playsInline
            className="absolute inset-0 block h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-sm text-muted-foreground">
            No playable version available yet.
          </div>
        )}
      </div>
    </div>
  );
}

export function ListingClipManagerClipList({
  clipItems,
  selectedClipId,
  isDesktopLayout,
  onSelectClip,
  getItemThumbnail,
  getItemDuration,
  isItemRegenerating,
  formatDuration,
  formatGeneratedAt,
  renderSelectedMobileDetail
}: {
  clipItems: ListingClipVersionItem[];
  selectedClipId?: string | null;
  isDesktopLayout: boolean;
  onSelectClip: (item: ListingClipVersionItem) => void;
  getItemThumbnail: (item: ListingClipVersionItem) => string | null;
  getItemDuration: (item: ListingClipVersionItem) => number | null;
  isItemRegenerating: (item: ListingClipVersionItem) => boolean;
  formatDuration: (value?: number | null) => string;
  formatGeneratedAt: (value?: string | Date | null) => string;
  renderSelectedMobileDetail: (item: ListingClipVersionItem) => React.ReactNode;
}) {
  return (
    <div className="min-h-0 overflow-x-hidden rounded-xl border border-border bg-background lg:max-h-[calc(100vh-220px)] lg:self-start lg:overflow-y-auto">
      {clipItems.map((item) => {
        const isSelected = item.clipId === selectedClipId;
        const itemIsRegenerating = isItemRegenerating(item);
        return (
          <div
            key={item.clipId}
            className="border-b border-border last:border-b-0"
          >
            <button
              type="button"
              onClick={() => onSelectClip(item)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                isSelected && "bg-muted"
              )}
            >
              <div className="relative h-21 w-18 shrink-0 overflow-hidden rounded-lg bg-muted">
                {getItemThumbnail(item) ? (
                  <LoadingImage
                    src={getItemThumbnail(item) ?? ""}
                    alt={item.roomName}
                    fill
                    className="object-cover"
                  />
                ) : null}
                {itemIsRegenerating ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
                    <RegenerationSpinner label="Clip regeneration in progress" />
                  </div>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.roomName}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CalendarClock className="h-3 w-3" />
                  {itemIsRegenerating
                    ? "Regenerating now"
                    : formatGeneratedAt(item.currentVersion.generatedAt)}
                </p>
              </div>
              <span className="shrink-0 self-center text-xs text-muted-foreground tabular-nums">
                {formatDuration(getItemDuration(item))}
              </span>
            </button>
            {!isDesktopLayout && isSelected ? (
              <div
                data-testid={`mobile-clip-detail-${item.clipId}`}
                className="space-y-3 border-t border-border bg-background px-4 py-4"
              >
                {renderSelectedMobileDetail(item)}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function ListingClipManagerDesktopDetail({
  roomName,
  generatedAtLabel,
  durationLabel,
  isRegenerating,
  actions,
  player
}: {
  roomName?: string | null;
  generatedAtLabel: string;
  durationLabel: string;
  isRegenerating: boolean;
  actions: React.ReactNode;
  player: React.ReactNode;
}) {
  return (
    <div
      data-testid="desktop-clip-detail"
      className={cn(
        "relative grid gap-4 rounded-xl border border-border bg-background",
        "lg:min-h-0 lg:grid-rows-[minmax(0,1fr)]"
      )}
    >
      <div className="absolute inset-x-0 top-0 z-10 rounded-t-xl border-b border-border bg-background px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-medium text-foreground">
              {roomName ?? "Selected clip"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {generatedAtLabel}
            </p>
          </div>
          {isRegenerating ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <span>Regenerating</span>
              <Loader2 className="h-4 w-4 animate-spin" />
            </span>
          ) : (
            <p className="text-xs text-muted-foreground">{durationLabel}</p>
          )}
        </div>
      </div>

      <div
        className={cn(
          "grid min-h-0 min-w-0 gap-3 px-4 pb-4 pt-[88px] max-lg:min-h-min",
          "lg:h-full lg:grid-rows-[auto_minmax(0,1fr)]"
        )}
      >
        {actions}
        {player}
      </div>
    </div>
  );
}

export function ListingClipManagerActionControls({
  selectedVersionId,
  versions,
  selectedVersionHasVideo,
  selectedClipIsRegenerating,
  selectedClipBatchId,
  isSubmitting,
  isSelectingVersion,
  isCanceling,
  hasSelectedItem,
  isRegenerateMenuOpen,
  isCustomizeExpanded,
  draftAiDirections,
  onVersionChange,
  onDownload,
  onCancel,
  onRegenerateMenuOpenChange,
  onQuickRegenerate,
  onOpenCustomize,
  onBackToQuickActions,
  onDraftAiDirectionsChange,
  onSubmitCustomizedRegeneration,
  formatGeneratedAt,
  controlsClassName,
  selectClassName,
  textareaIdSuffix
}: {
  selectedVersionId?: string | null;
  versions: ListingClipVersionItem["versions"];
  selectedVersionHasVideo: boolean;
  selectedClipIsRegenerating: boolean;
  selectedClipBatchId?: string;
  isSubmitting: boolean;
  isSelectingVersion: boolean;
  isCanceling: boolean;
  hasSelectedItem: boolean;
  isRegenerateMenuOpen: boolean;
  isCustomizeExpanded: boolean;
  draftAiDirections: string;
  onVersionChange: (clipVersionId: string) => void;
  onDownload: () => void;
  onCancel: () => void;
  onRegenerateMenuOpenChange: (open: boolean) => void;
  onQuickRegenerate: () => void;
  onOpenCustomize: () => void;
  onBackToQuickActions: () => void;
  onDraftAiDirectionsChange: (value: string) => void;
  onSubmitCustomizedRegeneration: () => void;
  formatGeneratedAt: (value?: string | Date | null) => string;
  controlsClassName?: string;
  selectClassName?: string;
  textareaIdSuffix?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-row items-end justify-between gap-2 sm:gap-3",
        controlsClassName
      )}
    >
      <div className={cn("min-w-0 flex-1", selectClassName)}>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Version
        </p>
        <Select
          value={selectedVersionId ?? undefined}
          onValueChange={onVersionChange}
        >
          <SelectTrigger className="w-full min-w-0 text-sm">
            <SelectValue placeholder="Choose a version" />
          </SelectTrigger>
          <SelectContent>
            {versions.map((version) => (
              <SelectItem
                key={
                  version.clipVersionId ??
                  `${version.id}-${version.versionNumber}`
                }
                value={version.clipVersionId ?? ""}
              >
                {formatGeneratedAt(version.generatedAt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {selectedVersionHasVideo ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={onDownload}
                className="h-9 w-9"
                aria-label="Download clip"
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Download clip</TooltipContent>
          </Tooltip>
        ) : null}

        {selectedClipIsRegenerating && selectedClipBatchId ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isCanceling}
            className="shrink-0"
            aria-label="Cancel generation"
          >
            {isCanceling ? "Canceling..." : "Cancel"}
          </Button>
        ) : (
          <Popover
            open={isRegenerateMenuOpen}
            onOpenChange={onRegenerateMenuOpenChange}
          >
            <PopoverTrigger asChild>
              <Button
                type="button"
                disabled={
                  isSubmitting ||
                  isSelectingVersion ||
                  !hasSelectedItem ||
                  selectedClipIsRegenerating
                }
                className="shrink-0 gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="bottom"
              sideOffset={4}
              className={cn(
                "backdrop-blur-xl z-50 overflow-hidden overflow-y-auto rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-xl",
                isCustomizeExpanded
                  ? "w-[min(28rem,calc(100vw-1.5rem))]"
                  : "w-72",
                "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 animate-duration-200"
              )}
              onOpenAutoFocus={
                isCustomizeExpanded
                  ? undefined
                  : (event) => event.preventDefault()
              }
            >
              {!isCustomizeExpanded ? (
                <div className="py-0">
                  <button
                    type="button"
                    className={cn(
                      "flex w-full cursor-pointer flex-col items-start gap-1 rounded-none px-4 py-2.5 text-left text-sm outline-none select-none transition-colors",
                      "hover:bg-secondary hover:text-secondary-foreground",
                      "focus-visible:bg-secondary focus-visible:text-secondary-foreground",
                      selectedClipIsRegenerating &&
                        "pointer-events-none opacity-50"
                    )}
                    onClick={onQuickRegenerate}
                    disabled={selectedClipIsRegenerating}
                  >
                    <span className="font-medium text-foreground">
                      Quick regenerate
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Start a new version immediately using the current clip
                      settings.
                    </span>
                  </button>
                  <div className="h-px w-full shrink-0 bg-border/50" />
                  <button
                    type="button"
                    className={cn(
                      "flex w-full cursor-pointer flex-col items-start gap-1 rounded-none px-4 py-2.5 text-left text-sm outline-none select-none transition-colors",
                      "hover:bg-secondary hover:text-secondary-foreground",
                      "focus-visible:bg-secondary focus-visible:text-secondary-foreground",
                      selectedClipIsRegenerating &&
                        "pointer-events-none opacity-50"
                    )}
                    onClick={onOpenCustomize}
                    disabled={selectedClipIsRegenerating}
                  >
                    <span className="font-medium text-foreground">
                      Customize prompt
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Add additional AI directions before regenerating this
                      clip.
                    </span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 px-4 py-3">
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      Customize prompt
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor={`clip-manager-ai-directions-${textareaIdSuffix ?? "desktop"}`}
                      className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      AI Directions
                    </label>
                    <textarea
                      id={`clip-manager-ai-directions-${textareaIdSuffix ?? "desktop"}`}
                      value={draftAiDirections}
                      onChange={(event) =>
                        onDraftAiDirectionsChange(event.target.value)
                      }
                      rows={4}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
                      placeholder="Optional: add extra steering for this clip regeneration."
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onBackToQuickActions}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={onSubmitCustomizedRegeneration}
                      disabled={
                        isSubmitting ||
                        !hasSelectedItem ||
                        selectedClipIsRegenerating
                      }
                      className="gap-2 shrink-0"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Regenerate
                    </Button>
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
