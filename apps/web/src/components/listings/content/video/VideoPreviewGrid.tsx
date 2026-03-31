"use client";

import * as React from "react";
import { toast } from "sonner";
import type { PreviewTimelinePlan } from "@web/src/lib/domain/listings/content/createPreviewPlans";
import type { ListingContentSubcategory } from "@shared/types/models";
import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";
import type { ListingOpenHouseContext } from "@web/src/lib/domain/listings/content/openHouse";
import {
  regenerateListingVideoReelText,
  saveAndFavoriteListingVideoReel,
  saveListingVideoReel
} from "@web/src/server/actions/listings/content/reels";
import { buildPlayablePreviews } from "@web/src/components/listings/content/video/domain/videoPreviewViewModel";
import { PREVIEW_FPS } from "@web/src/components/listings/content/video/domain/constants";
import { useHoverReveal } from "@web/src/components/listings/content/video/domain/hooks";
import {
  clampReelDownloadProgress,
  readReelDownloadBlob
} from "@web/src/components/listings/content/video/domain/reelExportClient";
import { VideoPreviewCard } from "@web/src/components/listings/content/video/subcomponents/VideoPreviewCard";
import { VideoPreviewModal } from "@web/src/components/listings/content/video/VideoPreviewModal";
import { VideoPreviewSkeletonCard } from "@web/src/components/listings/content/video/subcomponents/VideoPreviewSkeletonCard";
import type { PlayablePreviewTextUpdate } from "@web/src/components/listings/content/shared/types";
import type {
  ListingReelExportJob,
  ListingReelExportQuality,
  ListingReelExportRequest,
  ListingReelExportStatus,
  RegenerateListingVideoReelTextParams
} from "@web/src/lib/domain/listings/content/reels";
import {
  fetchApiData,
  fetchStreamResponse
} from "@web/src/lib/core/http/client";

type ReelPreviewDownloadState = {
  exportId: string | null;
  filenameBase: string;
  status: ListingReelExportStatus | "starting";
  quality: ListingReelExportQuality;
  progress: number;
  downloadReady: boolean;
  errorMessage?: string;
  artifactDownloadStarted: boolean;
  hasShownQueuedToast: boolean;
};

const REEL_EXPORT_POLL_INTERVAL_MS = 1000;

type ListingVideoPreviewGridProps = {
  listingId: string;
  plans: PreviewTimelinePlan[];
  items: ContentItem[];
  captionItems: ContentItem[];
  listingSubcategory: ListingContentSubcategory;
  listingAddress: string | null;
  openHouseContext: ListingOpenHouseContext | null;
  userMediaVideoCount: number;
  forceSimpleOverlayTemplate?: boolean;
  loadingCount?: number;
  onReplacePreviewItem: (params: {
    previousContentItemId: string;
    nextItem: ContentItem;
  }) => void;
};

export function ListingVideoPreviewGrid({
  listingId,
  plans,
  items,
  captionItems,
  listingSubcategory,
  listingAddress,
  openHouseContext,
  userMediaVideoCount,
  forceSimpleOverlayTemplate = false,
  loadingCount = 0,
  onReplacePreviewItem
}: ListingVideoPreviewGridProps) {
  const [selectedPlanId, setSelectedPlanId] = React.useState<string | null>(
    null
  );
  const [downloadStatesByPreviewId, setDownloadStatesByPreviewId] =
    React.useState<Record<string, ReelPreviewDownloadState>>({});
  const { activeId, revealedId, handleEnter, handleLeave } = useHoverReveal();

  const playablePlans = React.useMemo(
    () =>
      buildPlayablePreviews({
        plans,
        items,
        captionItems,
        listingSubcategory,
        listingAddress,
        openHouseContext,
        forceSimpleOverlayTemplate,
        previewFps: PREVIEW_FPS
      }),
    [
      captionItems,
      forceSimpleOverlayTemplate,
      items,
      listingAddress,
      openHouseContext,
      listingSubcategory,
      plans
    ]
  );

  const skeletonCount = Math.max(0, loadingCount);

  const selectedPreview =
    playablePlans.find((preview) => preview.id === selectedPlanId) ?? null;

  const handleSavePreviewText = React.useCallback(
    async (params: PlayablePreviewTextUpdate) => {
      if (!selectedPreview?.captionItem || !selectedPreview.captionItemKey) {
        throw new Error("This preview cannot be edited yet.");
      }

      const savedItem = await saveListingVideoReel(listingId, params);

      onReplacePreviewItem({
        previousContentItemId: selectedPreview.captionItem.id,
        nextItem: savedItem
      });
    },
    [listingId, onReplacePreviewItem, selectedPreview]
  );

  const handleSaveAndFavoritePreview = React.useCallback(
    async (params: PlayablePreviewTextUpdate) => {
      if (!selectedPreview?.captionItem || !selectedPreview.captionItemKey) {
        throw new Error("This preview cannot be edited yet.");
      }

      const savedItem = await saveAndFavoriteListingVideoReel(
        listingId,
        params
      );

      onReplacePreviewItem({
        previousContentItemId: selectedPreview.captionItem.id,
        nextItem: savedItem
      });
    },
    [listingId, onReplacePreviewItem, selectedPreview]
  );

  const handleRegeneratePreviewText = React.useCallback(
    async (params: RegenerateListingVideoReelTextParams) => {
      if (!selectedPreview?.captionItem || !selectedPreview.captionItemKey) {
        throw new Error("This preview cannot be edited yet.");
      }

      return regenerateListingVideoReelText(listingId, params);
    },
    [listingId, selectedPreview]
  );

  const downloadArtifact = React.useCallback(
    async (previewId: string, exportJob: ReelPreviewDownloadState) => {
      if (!exportJob.exportId) {
        return;
      }

      const response = await fetchStreamResponse(
        `/api/v1/listings/${listingId}/reels/exports/${exportJob.exportId}/download?filenameBase=${encodeURIComponent(exportJob.filenameBase)}`,
        undefined,
        "Failed to download reel preview."
      );

      const blob = await readReelDownloadBlob(response, (progress) => {
        setDownloadStatesByPreviewId((current) => {
          const active = current[previewId];
          if (!active) {
            return current;
          }

          return {
            ...current,
            [previewId]: {
              ...active,
              progress: Math.max(
                active.progress,
                clampReelDownloadProgress(progress)
              )
            }
          };
        });
      });

      const objectUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      const fileName =
        response.headers
          .get("Content-Disposition")
          ?.match(/filename=\"?([^"]+)\"?/)?.[1] ??
        `${exportJob.filenameBase}.mp4`;
      downloadLink.href = objectUrl;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("Reel download complete.");
      setDownloadStatesByPreviewId((current) => {
        const next = { ...current };
        delete next[previewId];
        return next;
      });
    },
    [listingId]
  );

  const handleDownloadPreview = React.useCallback(
    async (params: {
      previewId: string;
      exportRequest: ListingReelExportRequest;
    }) => {
      const activeState = downloadStatesByPreviewId[params.previewId];
      if (
        activeState &&
        activeState.status !== "failed" &&
        activeState.status !== "canceled"
      ) {
        return;
      }

      setDownloadStatesByPreviewId((current) => ({
        ...current,
        [params.previewId]: {
          exportId: null,
          filenameBase: params.exportRequest.filenameBase ?? "reel-preview",
          status: "starting",
          quality: params.exportRequest.quality ?? "standard",
          progress: 0,
          downloadReady: false,
          artifactDownloadStarted: false,
          hasShownQueuedToast: false
        }
      }));
      toast("Started downloading reel preview.");

      try {
        const response = await fetchApiData<ListingReelExportJob>(
          `/api/v1/listings/${listingId}/reels/exports`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params.exportRequest)
          },
          "Failed to start reel export."
        );

        setDownloadStatesByPreviewId((current) => ({
          ...current,
          [params.previewId]: {
            exportId: response.exportId,
            filenameBase: params.exportRequest.filenameBase ?? "reel-preview",
            status: response.status,
            quality: params.exportRequest.quality ?? "standard",
            progress: clampReelDownloadProgress(response.progress),
            downloadReady: response.downloadReady,
            errorMessage: response.errorMessage,
            artifactDownloadStarted: false,
            hasShownQueuedToast: false
          }
        }));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to download reel preview.";
        toast.error(message);
        setDownloadStatesByPreviewId((current) => {
          const next = { ...current };
          delete next[params.previewId];
          return next;
        });
      }
    },
    [downloadStatesByPreviewId, listingId]
  );

  React.useEffect(() => {
    const pendingEntries = Object.entries(downloadStatesByPreviewId).filter(
      ([, state]) =>
        Boolean(state.exportId) &&
        (state.status === "queued" ||
          state.status === "upscaling" ||
          state.status === "rendering" ||
          state.status === "starting")
    );

    if (pendingEntries.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      pendingEntries.forEach(([previewId, state]) => {
        if (!state.exportId || state.status === "starting") {
          return;
        }

        void fetchApiData<ListingReelExportJob>(
          `/api/v1/listings/${listingId}/reels/exports/${state.exportId}`,
          { cache: "no-store" },
          "Failed to load reel export status."
        )
          .then((status) => {
            setDownloadStatesByPreviewId((current) => {
              const active = current[previewId];
              if (!active) {
                return current;
              }

              return {
                ...current,
                [previewId]: {
                  ...active,
                  status: status.status,
                  progress: Math.max(
                    active.progress,
                    clampReelDownloadProgress(status.progress)
                  ),
                  downloadReady: status.downloadReady,
                  errorMessage: status.errorMessage
                }
              };
            });
          })
          .catch((error) => {
            const message =
              error instanceof Error
                ? error.message
                : "Failed to load reel export status.";
            toast.error(message);
            setDownloadStatesByPreviewId((current) => {
              const next = { ...current };
              delete next[previewId];
              return next;
            });
          });
      });
    }, REEL_EXPORT_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [downloadStatesByPreviewId, listingId]);

  React.useEffect(() => {
    Object.entries(downloadStatesByPreviewId).forEach(([previewId, state]) => {
      if (state.status === "queued" && !state.hasShownQueuedToast) {
        toast(
          "Queuing reel preview for download, waiting for other downloads to finish."
        );
        setDownloadStatesByPreviewId((current) => {
          const active = current[previewId];
          if (!active || active.hasShownQueuedToast) {
            return current;
          }

          return {
            ...current,
            [previewId]: {
              ...active,
              hasShownQueuedToast: true
            }
          };
        });
        return;
      }

      if (
        state.status === "completed" &&
        state.downloadReady &&
        !state.artifactDownloadStarted
      ) {
        setDownloadStatesByPreviewId((current) => ({
          ...current,
          [previewId]: {
            ...state,
            artifactDownloadStarted: true,
            progress: 1
          }
        }));
        void downloadArtifact(previewId, {
          ...state,
          artifactDownloadStarted: true,
          progress: 1
        }).catch((error) => {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to download reel preview.";
          toast.error(message);
          setDownloadStatesByPreviewId((current) => {
            const next = { ...current };
            delete next[previewId];
            return next;
          });
        });
        return;
      }

      if (state.status === "failed" || state.status === "canceled") {
        const message =
          state.errorMessage ??
          (state.status === "canceled"
            ? "Reel export was canceled."
            : "Failed to download reel preview.");
        toast.error(message);
        setDownloadStatesByPreviewId((current) => {
          const next = { ...current };
          delete next[previewId];
          return next;
        });
      }
    });
  }, [downloadArtifact, downloadStatesByPreviewId]);

  if (playablePlans.length === 0 && skeletonCount === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 xl:grid-cols-4">
        {playablePlans.map((preview) => (
          <VideoPreviewCard
            key={preview.id}
            preview={preview}
            isActive={activeId === preview.id}
            isRevealed={revealedId === preview.id}
            isFavorite={preview.captionItem?.isFavorite ?? false}
            previewFps={PREVIEW_FPS}
            onEnter={() => handleEnter(preview.id)}
            onLeave={handleLeave}
            onSelect={() => setSelectedPlanId(preview.id)}
            onToggleFavorite={() => setSelectedPlanId(preview.id)}
          />
        ))}
        {[...Array(skeletonCount).keys()].map((n) => (
          <VideoPreviewSkeletonCard key={`skeleton-video-${n}`} />
        ))}
      </div>

      <VideoPreviewModal
        selectedPreview={selectedPreview}
        listingId={listingId}
        userMediaVideoCount={userMediaVideoCount}
        previewFps={PREVIEW_FPS}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPlanId(null);
          }
        }}
        onSavePreviewText={handleSavePreviewText}
        onSaveAndFavoritePreview={handleSaveAndFavoritePreview}
        onRegeneratePreviewText={handleRegeneratePreviewText}
        downloadState={
          selectedPreview
            ? downloadStatesByPreviewId[selectedPreview.id]
              ? {
                  isDownloading: true,
                  progress:
                    downloadStatesByPreviewId[selectedPreview.id]?.progress ??
                    0,
                  status: downloadStatesByPreviewId[selectedPreview.id]?.status,
                  quality:
                    downloadStatesByPreviewId[selectedPreview.id]?.quality
                }
              : null
            : null
        }
        onDownloadPreview={
          selectedPreview
            ? async (exportRequest) =>
                handleDownloadPreview({
                  previewId: selectedPreview.id,
                  exportRequest
                })
            : undefined
        }
      />
    </>
  );
}
