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
  RefreshCw
} from "lucide-react";
import type { ListingClipVersionItem } from "@web/src/components/listings/create/shared/types";
import { Button } from "@web/src/components/ui/button";
import { LoadingImage } from "@web/src/components/ui/loading-image";
import { cn } from "@web/src/components/ui/utils";
import { fetchApiData } from "@web/src/lib/core/http/client";
import { regenerateListingClipVersion } from "@web/src/server/actions/video/generate";
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

type ListingClipManagerProps = {
  listingId: string;
  items: ListingClipVersionItem[];
  mode?: "card" | "workspace";
};

function hasPendingItems(items: ListingClipVersionItem[]) {
  return items.some((item) =>
    ["pending", "processing"].includes(item.currentVersion.versionStatus ?? "")
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
  const [isRegenerateOpen, setIsRegenerateOpen] = React.useState(false);
  const [isSubmitting, startTransition] = React.useTransition();
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
      refreshInterval: hasPendingItems(clipItems) ? 2000 : 0,
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

  const handleRegenerate = () => {
    if (!selectedItem) return;
    startTransition(() => {
      void regenerateListingClipVersion({
        listingId,
        clipId:
          selectedItem.currentVersion.clipVersionId ?? selectedItem.clipId,
        aiDirections: draftAiDirections
      })
        .then(() => {
          setClipItems((currentItems) =>
            currentItems.map((item) =>
              item.clipId === selectedItem.clipId
                ? {
                    ...item,
                    currentVersion: {
                      ...item.currentVersion,
                      aiDirections: draftAiDirections,
                      versionStatus: "processing"
                    }
                  }
                : item
            )
          );
          setIsRegenerateOpen(false);
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

  if (!clipItems.length) {
    return (
      <div className="rounded-2xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">
        No generated clips are available yet.
      </div>
    );
  }

  return (
    <div className="grid min-h-[max(640px,calc(100vh-220px))] gap-6 overflow-x-hidden overflow-y-auto max-md:grid-rows-[auto_auto] md:grid-cols-[300px_minmax(0,1fr)]">
      <div className="min-h-0 max-h-[45vh] overflow-y-auto rounded-xl border border-border bg-background md:max-h-none">
        {clipItems.map((item) => {
          const isSelected = item.clipId === selectedItem?.clipId;
          return (
            <button
              key={item.clipId}
              type="button"
              onClick={() => {
                setSelectedClipId(item.clipId);
                setSelectedVersionId(item.currentVersion.clipVersionId ?? null);
              }}
              className={cn(
                "flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/60",
                isSelected && "bg-muted"
              )}
            >
              <div className="relative h-[5.25rem] w-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-muted">
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
                  {item.currentVersion.versionStatus === "pending" ||
                  item.currentVersion.versionStatus === "processing"
                    ? "Regenerating now"
                    : formatGeneratedAt(item.currentVersion.generatedAt)}
                </p>
              </div>
              <span className="shrink-0 self-center text-xs text-muted-foreground tabular-nums">
                {formatDuration(item.currentVersion.durationSeconds)}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "relative grid gap-4 rounded-xl border border-border bg-background",
          "md:min-h-0 md:grid-rows-[minmax(0,1fr)]"
        )}
      >
        <div className="absolute inset-x-0 top-0 z-10 rounded-t-xl border-b border-border bg-background px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-medium text-foreground">
                {selectedItem?.roomName ?? "Selected clip"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedVersion?.versionStatus === "pending" ||
                selectedVersion?.versionStatus === "processing"
                  ? "Regenerating now"
                  : formatGeneratedAt(selectedVersion?.generatedAt)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDuration(selectedVersion?.durationSeconds)}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "grid min-h-0 min-w-0 gap-3 px-4 pb-4 pt-[88px] max-md:min-h-min",
            "md:h-full md:grid-rows-[auto_minmax(0,1fr)]"
          )}
        >
          <div className="flex flex-row items-end justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1 md:max-w-[280px]">
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

            <Popover open={isRegenerateOpen} onOpenChange={setIsRegenerateOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  disabled={isSubmitting || !selectedItem}
                  className="shrink-0 gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" side="bottom" className="w-[360px]">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Regenerate clip
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Add optional AI directions, then start a new version.
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      AI Directions
                    </label>
                    <textarea
                      value={draftAiDirections}
                      onChange={(event) =>
                        setDraftAiDirections(event.target.value)
                      }
                      rows={4}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
                      placeholder="Add extra steering for this clip regeneration."
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsRegenerateOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleRegenerate}
                      disabled={isSubmitting || !selectedItem}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Start regenerate
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="min-h-0 min-w-0">
            <div
              className={cn(
                "relative isolate overflow-hidden rounded-xl border border-border bg-black",
                "aspect-video w-full min-h-[max(12.5rem,56.25vw)] max-md:shrink-0",
                "md:aspect-auto md:h-full md:min-h-0"
              )}
            >
              {selectedVersion?.videoUrl ? (
                <video
                  key={selectedVersion.videoUrl}
                  src={selectedVersion.videoUrl}
                  poster={selectedVersion.thumbnail ?? undefined}
                  controls
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full min-h-50 items-center justify-center text-sm text-white/70">
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

export function ListingClipManagerBackButton({
  href
}: {
  href: string;
}) {
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
