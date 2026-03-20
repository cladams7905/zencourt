"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Download,
  Loader2,
  RefreshCw
} from "lucide-react";
import type { ListingClipVersionItem } from "@web/src/components/listings/create/shared/types";
import { Button } from "@web/src/components/ui/button";
import { LoadingImage } from "@web/src/components/ui/loading-image";
import { cn } from "@web/src/components/ui/utils";
import { fetchApiData } from "@web/src/lib/core/http/client";
import { regenerateListingClipVersion } from "@web/src/server/actions/video/generate";
import {
  getClipRegenerationSoftTimeoutMs,
  isPastTimeout,
  VIDEO_GENERATION_TIMEOUT_MESSAGE
} from "@web/src/lib/domain/listing/videoGenerationTimeouts";
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

type ListingClipManagerProps = {
  listingId: string;
  items: ListingClipVersionItem[];
  mode?: "card" | "workspace";
};

function hasPendingItems(items: ListingClipVersionItem[]) {
  return items.some((item) =>
    isClipRegenerating(item.currentVersion.versionStatus)
  );
}

function hasPollablePendingItems(
  items: ListingClipVersionItem[],
  timedOutClipIds: Set<string>
) {
  return items.some(
    (item) =>
      isClipRegenerating(item.currentVersion.versionStatus) &&
      !timedOutClipIds.has(item.clipId)
  );
}

function isClipRegenerating(status?: string | null) {
  return ["pending", "processing"].includes(status ?? "");
}

function RegenerationSpinner({ label }: { label: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className="inline-flex items-center justify-center text-muted-foreground"
    >
      <Loader2 className="h-4 w-4 animate-spin" />
    </span>
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

function mergeClipItems(nextItems: ListingClipVersionItem[]) {
  return nextItems.map((item) => ({
    ...item,
    versions: [...item.versions].sort(
      (a, b) => (b.versionNumber ?? 0) - (a.versionNumber ?? 0)
    )
  }));
}

function serializeClipItems(itemsToSerialize: ListingClipVersionItem[]) {
  return JSON.stringify(
    itemsToSerialize.map((item) => ({
      clipId: item.clipId,
      roomName: item.roomName,
      currentVersion: {
        clipVersionId: item.currentVersion.clipVersionId ?? null,
        versionStatus: item.currentVersion.versionStatus ?? null,
        aiDirections: item.currentVersion.aiDirections ?? null,
        videoUrl: item.currentVersion.videoUrl ?? null,
        thumbnail: item.currentVersion.thumbnail ?? null,
        generatedAt: item.currentVersion.generatedAt ?? null
      },
      versions: item.versions.map((version) => ({
        clipVersionId: version.clipVersionId ?? null,
        versionNumber: version.versionNumber ?? null,
        videoUrl: version.videoUrl ?? null,
        thumbnail: version.thumbnail ?? null,
        generatedAt: version.generatedAt ?? null
      }))
    }))
  );
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
      className="block w-full rounded-2xl border border-border bg-card p-4 text-left shadow-xs transition-colors hover:border-foreground/20"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
            View Generated Clips
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
          </p>
          <p className="text-xs text-muted-foreground">
            Open the clip manager to review each room clip and regenerate one
            without changing older reel cards.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          <Clapperboard className="h-3.5 w-3.5" />
          {items.length} clips
        </div>
      </div>
    </Link>
  );
}

function ClipManagerWorkspace({
  listingId,
  items
}: Pick<ListingClipManagerProps, "listingId" | "items">) {
  const [clipItems, setClipItems] = React.useState(() => mergeClipItems(items));
  const [selectedClipId, setSelectedClipId] = React.useState<string | null>(
    items[0]?.clipId ?? null
  );
  const [selectedVersionId, setSelectedVersionId] = React.useState<
    string | null
  >(items[0]?.currentVersion.clipVersionId ?? null);
  const [draftAiDirections, setDraftAiDirections] = React.useState("");
  const [isRegenerateMenuOpen, setIsRegenerateMenuOpen] = React.useState(false);
  const [isCustomizeExpanded, setIsCustomizeExpanded] = React.useState(false);
  const [isSubmitting, startTransition] = React.useTransition();
  const [timedOutClipIds, setTimedOutClipIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const previousStatusesRef = React.useRef<Map<string, string>>(new Map());
  const lastSignatureRef = React.useRef(
    serializeClipItems(mergeClipItems(items))
  );
  React.useEffect(() => {
    const normalized = mergeClipItems(items);
    const nextSignature = serializeClipItems(normalized);
    if (nextSignature === lastSignatureRef.current) {
      return;
    }

    lastSignatureRef.current = nextSignature;
    setClipItems(normalized);
  }, [items]);

  const { data } = useSWR(
    `/api/v1/listings/${listingId}/clip-versions`,
    (url: string) =>
      fetchApiData<{ clipVersionItems: ListingClipVersionItem[] }>(
        url,
        undefined,
        "Failed to load clip versions."
      ),
    {
      refreshInterval: hasPollablePendingItems(clipItems, timedOutClipIds)
        ? 2000
        : 0,
      revalidateOnFocus: false
    }
  );

  React.useEffect(() => {
    const nextItems = data?.clipVersionItems;
    if (!nextItems?.length) return;

    const normalized = mergeClipItems(nextItems);
    const nextStatuses = new Map<string, string>();

    for (const item of normalized) {
      const status = item.currentVersion.versionStatus ?? "";
      nextStatuses.set(item.clipId, status);
      const previousStatus = previousStatusesRef.current.get(item.clipId);

      if (previousStatus && previousStatus !== status) {
        if (
          ["pending", "processing"].includes(previousStatus) &&
          status === "completed"
        ) {
          toast.success(`${item.roomName} clip regenerated.`);
          setSelectedClipId(item.clipId);
          setSelectedVersionId(item.currentVersion.clipVersionId ?? null);
        } else if (
          ["pending", "processing"].includes(previousStatus) &&
          status === "failed"
        ) {
          toast.error(`Failed to regenerate ${item.roomName} clip.`);
        }
      }
    }

    previousStatusesRef.current = nextStatuses;
    const nextSignature = serializeClipItems(normalized);
    if (nextSignature !== lastSignatureRef.current) {
      lastSignatureRef.current = nextSignature;
      setClipItems(normalized);
    }
  }, [data]);

  React.useEffect(() => {
    const nextTimedOutClipIds = new Set(timedOutClipIds);
    let didChange = false;

    for (const item of clipItems) {
      const isRegenerating = isClipRegenerating(item.currentVersion.versionStatus);

      if (!isRegenerating) {
        if (nextTimedOutClipIds.delete(item.clipId)) {
          didChange = true;
        }
        continue;
      }

      if (
        !nextTimedOutClipIds.has(item.clipId) &&
        isPastTimeout(
          item.currentVersion.generatedAt,
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
  }, [clipItems, timedOutClipIds]);

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

    const selectedItem =
      clipItems.find((item) => item.clipId === selectedClipId) ?? clipItems[0];
    if (!selectedItem) return;

    if (selectedItem.clipId !== selectedClipId) {
      setSelectedClipId(selectedItem.clipId);
    }

    const selectedVersion =
      selectedItem.versions.find(
        (version) => version.clipVersionId === selectedVersionId
      ) ?? selectedItem.currentVersion;
    const nextSelectedVersionId = selectedVersion.clipVersionId ?? null;
    if (nextSelectedVersionId !== selectedVersionId) {
      setSelectedVersionId(nextSelectedVersionId);
    }

    const nextAiDirections = selectedItem.currentVersion.aiDirections ?? "";
    if (nextAiDirections !== draftAiDirections) {
      setDraftAiDirections(nextAiDirections);
    }
  }, [clipItems, draftAiDirections, selectedClipId, selectedVersionId]);

  const selectedItem =
    clipItems.find((item) => item.clipId === selectedClipId) ?? clipItems[0];
  const selectedVersion =
    selectedItem?.versions.find(
      (version) => version.clipVersionId === selectedVersionId
    ) ?? selectedItem?.currentVersion;
  const selectedClipIsRegenerating = isClipRegenerating(
    selectedItem?.currentVersion.versionStatus
  );

  const submitRegeneration = (aiDirections: string) => {
    if (!selectedItem) return;
    startTransition(() => {
      void regenerateListingClipVersion({
        listingId,
        clipId: selectedItem.clipId,
        aiDirections
      })
        .then((result) => {
          setClipItems((currentItems) =>
            currentItems.map((item) =>
              item.clipId === selectedItem.clipId
                ? {
                    ...item,
                    currentVersion: {
                      ...item.currentVersion,
                      clipVersionId: result.clipVersionId,
                      aiDirections,
                      generatedAt: new Date().toISOString(),
                      versionStatus: "processing"
                    }
                  }
                : item
            )
          );
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
  };

  const handleRegenerate = () => {
    const savedAiDirections = selectedItem?.currentVersion.aiDirections ?? "";
    setDraftAiDirections(savedAiDirections);
    submitRegeneration(savedAiDirections);
  };

  const handleOpenCustomize = () => {
    setDraftAiDirections(selectedItem?.currentVersion.aiDirections ?? "");
    setIsCustomizeExpanded(true);
  };

  const handleRegenerateMenuOpenChange = (open: boolean) => {
    setIsRegenerateMenuOpen(open);
    if (!open) {
      setIsCustomizeExpanded(false);
    }
  };

  const handleDownloadClip = () => {
    const videoUrl = selectedVersion?.videoUrl;
    if (!videoUrl) {
      toast.error("No clip available to download.");
      return;
    }

    window.open(videoUrl, "_blank", "noopener,noreferrer");
  };

  if (!clipItems.length) {
    return (
      <div className="rounded-2xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">
        No generated clips are available yet.
      </div>
    );
  }

  return (
    <div className="grid min-h-[max(640px,calc(100vh-220px))] gap-6 overflow-x-hidden overflow-y-auto max-lg:grid-rows-[auto_auto] lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="min-h-0 max-h-[min(70dvh,calc(100dvh-11rem))] self-start overflow-x-hidden overflow-y-auto rounded-xl border border-border bg-background">
        {clipItems.map((item) => {
          const isSelected = item.clipId === selectedItem?.clipId;
          const itemIsRegenerating = isClipRegenerating(
            item.currentVersion.versionStatus
          );
          return (
            <button
              key={item.clipId}
              type="button"
              onClick={() => {
                setSelectedClipId(item.clipId);
                setSelectedVersionId(item.currentVersion.clipVersionId ?? null);
              }}
              className={cn(
                "flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/60 last:border-b-0",
                isSelected && "bg-muted"
              )}
            >
              <div className="relative h-21 w-18 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.currentVersion.thumbnail ? (
                  <LoadingImage
                    src={item.currentVersion.thumbnail}
                    alt={item.roomName}
                    fill
                    className="object-cover"
                  />
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
              {itemIsRegenerating ? (
                <RegenerationSpinner label="Clip regeneration in progress" />
              ) : (
                <span className="shrink-0 self-center text-xs text-muted-foreground tabular-nums">
                  {formatDuration(item.currentVersion.durationSeconds)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "relative grid gap-4 rounded-xl border border-border bg-background",
          "lg:min-h-0 lg:grid-rows-[minmax(0,1fr)]"
        )}
      >
        <div className="absolute inset-x-0 top-0 z-10 rounded-t-xl border-b border-border bg-background px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-medium text-foreground">
                {selectedItem?.roomName ?? "Selected clip"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedClipIsRegenerating
                  ? "Regenerating now"
                  : formatGeneratedAt(selectedVersion?.generatedAt)}
              </p>
            </div>
            {selectedClipIsRegenerating ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <span>Regenerating</span>
                <RegenerationSpinner label="Clip regeneration in progress" />
              </span>
            ) : (
              <p className="text-xs text-muted-foreground">
                {formatDuration(selectedVersion?.durationSeconds)}
              </p>
            )}
          </div>
        </div>

        <div
          className={cn(
            "grid min-h-0 min-w-0 gap-3 px-4 pb-4 pt-[88px] max-lg:min-h-min",
            "lg:h-full lg:grid-rows-[auto_minmax(0,1fr)]"
          )}
        >
          <div className="flex flex-row items-end justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1 lg:max-w-[280px]">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Version
              </p>
              <Select
                value={selectedVersion?.clipVersionId ?? undefined}
                onValueChange={(value) => setSelectedVersionId(value)}
              >
                <SelectTrigger className="w-full min-w-0 text-sm">
                  <SelectValue placeholder="Choose a version" />
                </SelectTrigger>
                <SelectContent>
                  {selectedItem?.versions.map((version) => (
                    <SelectItem
                      key={
                        version.clipVersionId ??
                        `${selectedItem.clipId}-${version.versionNumber}`
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
              {selectedVersion?.videoUrl ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={handleDownloadClip}
                      className="h-9 w-9"
                      aria-label="Download clip"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Download clip</TooltipContent>
                </Tooltip>
              ) : null}

              <Popover
                open={isRegenerateMenuOpen}
                onOpenChange={handleRegenerateMenuOpenChange}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    disabled={
                      isSubmitting ||
                      !selectedItem ||
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
                        onClick={handleRegenerate}
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
                        onClick={handleOpenCustomize}
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
                          htmlFor="clip-manager-ai-directions"
                          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          AI Directions
                        </label>
                        <textarea
                          id="clip-manager-ai-directions"
                          value={draftAiDirections}
                          onChange={(event) =>
                            setDraftAiDirections(event.target.value)
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
                          onClick={() => setIsCustomizeExpanded(false)}
                        >
                          Back
                        </Button>
                        <Button
                          type="button"
                          onClick={() => submitRegeneration(draftAiDirections)}
                          disabled={
                            isSubmitting ||
                            !selectedItem ||
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
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 lg:h-full">
            <div
              className={cn(
                "relative isolate min-h-0 w-full min-w-0 overflow-hidden rounded-xl border border-border bg-black",
                "min-h-[min(70dvh,calc(100dvh-11rem))]",
                "lg:h-full lg:min-h-0"
              )}
            >
              {selectedVersion?.videoUrl ? (
                <video
                  key={selectedVersion.videoUrl}
                  src={selectedVersion.videoUrl}
                  poster={selectedVersion.thumbnail ?? undefined}
                  controls
                  playsInline
                  className="absolute inset-0 block h-full w-full object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
                  No playable version available yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
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
