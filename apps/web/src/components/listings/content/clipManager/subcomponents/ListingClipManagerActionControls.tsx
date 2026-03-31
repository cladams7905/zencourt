"use client";

import * as React from "react";
import { Download, RefreshCw } from "lucide-react";
import type { ListingClipVersionItem } from "@web/src/components/listings/content/shared/types";
import { Button } from "@web/src/components/ui/button";
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
