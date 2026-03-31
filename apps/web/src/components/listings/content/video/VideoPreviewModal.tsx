import * as React from "react";
import type { PlayerRef } from "@remotion/player";
import useSWR from "swr";
import { Download, Heart, Hourglass, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@web/src/components/ui/dialog";
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
import { Button } from "@web/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@web/src/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@web/src/components/ui/tooltip";
import { getTimelineDurationInFrames } from "@web/src/components/listings/content/video/subcomponents/VideoPreviewTimelineComposition";
import { VideoPreviewPlayer } from "@web/src/components/listings/content/video/subcomponents/VideoPreviewPlayer";
import {
  VideoPreviewEditorActions,
  VideoPreviewTextEditor
} from "@web/src/components/listings/content/video/subcomponents/VideoPreviewTextEditor";
import { VideoPreviewTimeline } from "@web/src/components/listings/content/video/subcomponents/VideoPreviewTimeline";
import {
  applyOverlayDraftToSegments,
  seedOverlayDraftFromPreview,
  VIDEO_PREVIEW_OVERLAY_BACKGROUND_OPTIONS,
  VIDEO_PREVIEW_OVERLAY_FONT_OPTIONS,
  VIDEO_PREVIEW_OVERLAY_POSITION_OPTIONS,
  type ReelOverlayDraft
} from "@web/src/components/listings/content/video/domain/videoPreviewOverlayControls";
import { useUserMediaReelPickerInfinite } from "@web/src/components/listings/content/video/domain/hooks";
import {
  clampReelDownloadProgress,
  readReelDownloadBlob
} from "@web/src/components/listings/content/video/domain/reelExportClient";
import type {
  ListingReelExportJob,
  ListingReelExportQuality,
  ListingReelExportRequest,
  ListingReelExportStatus,
  ReelTextRegenerationField,
  RegenerateListingVideoReelTextParams,
  RegenerateListingVideoReelTextResult
} from "@web/src/lib/domain/listings/content/reels";
import {
  fetchApiData,
  fetchStreamResponse
} from "@web/src/lib/core/http/client";
import type {
  PlayablePreview,
  PlayablePreviewTextUpdate
} from "@web/src/components/listings/content/shared/types";
import type { TimelinePreviewResolvedSegment } from "@web/src/components/listings/content/video/subcomponents/VideoPreviewTimelineComposition";
type VideoPreviewModalProps = {
  selectedPreview: PlayablePreview | null;
  listingId?: string;
  /** Count of user-owned video media (for enabling Add clip before picker fetch completes). */
  userMediaVideoCount: number;
  previewFps: number;
  onOpenChange: (open: boolean) => void;
  onSavePreviewText: (params: PlayablePreviewTextUpdate) => Promise<void>;
  onSaveAndFavoritePreview?: (
    params: PlayablePreviewTextUpdate
  ) => Promise<void>;
  onRegeneratePreviewText?: (
    params: RegenerateListingVideoReelTextParams
  ) => Promise<RegenerateListingVideoReelTextResult>;
  downloadState?: {
    isDownloading: boolean;
    progress: number;
    status?: ListingReelExportStatus | "starting";
    quality?: ListingReelExportQuality;
  } | null;
  onDownloadPreview?: (params: ListingReelExportRequest) => Promise<void>;
};

function cloneSegments(segments: TimelinePreviewResolvedSegment[]) {
  return segments.map((segment) => ({ ...segment }));
}

function getSharedTextOverlay(
  segments: TimelinePreviewResolvedSegment[]
): TimelinePreviewResolvedSegment["textOverlay"] {
  return segments.find((segment) => segment.textOverlay)?.textOverlay;
}

function getSharedSupplementalAddressOverlay(
  segments: TimelinePreviewResolvedSegment[]
): TimelinePreviewResolvedSegment["supplementalAddressOverlay"] {
  return segments.find((segment) => segment.supplementalAddressOverlay)
    ?.supplementalAddressOverlay;
}

function getSegmentSourceKey(segment: TimelinePreviewResolvedSegment): string {
  return `${segment.sourceType ?? "listing_clip"}:${segment.sourceId ?? segment.clipId}`;
}

function extractFileNameFromVideoUrl(
  url: string | null | undefined
): string | null {
  if (!url?.trim()) {
    return null;
  }
  try {
    const { pathname } = new URL(url);
    const segment = pathname.split("/").filter(Boolean).pop();
    if (!segment) {
      return null;
    }
    const decoded = decodeURIComponent(segment);
    const base = decoded.split("?")[0]?.trim();
    return base && base.length > 0 ? base : null;
  } catch {
    return null;
  }
}

const REEL_EXPORT_POLL_INTERVAL_MS = 1000;

function getDownloadStatusLabel(
  status: ListingReelExportStatus | "starting" | null | undefined,
  quality?: ListingReelExportQuality
) {
  switch (status) {
    case "starting":
      return "Starting download...";
    case "queued":
      return "Queued for export...";
    case "upscaling":
      return "Upscaling room clips...";
    case "rendering":
      return quality === "premium"
        ? "Rendering premium reel..."
        : "Rendering reel...";
    default:
      return null;
  }
}

export function VideoPreviewModal({
  selectedPreview,
  listingId,
  userMediaVideoCount,
  previewFps,
  onOpenChange,
  onSavePreviewText,
  onSaveAndFavoritePreview,
  onRegeneratePreviewText,
  downloadState,
  onDownloadPreview
}: VideoPreviewModalProps) {
  const playerRef = React.useRef<PlayerRef | null>(null);
  const [playerInstance, setPlayerInstance] = React.useState<PlayerRef | null>(
    null
  );
  const [hookDraft, setHookDraft] = React.useState("");
  const [captionDraft, setCaptionDraft] = React.useState("");
  const [overlayDraft, setOverlayDraft] = React.useState<ReelOverlayDraft>(
    seedOverlayDraftFromPreview(selectedPreview)
  );
  const [segmentDraft, setSegmentDraft] = React.useState<
    TimelinePreviewResolvedSegment[]
  >([]);
  const [undoStack, setUndoStack] = React.useState<
    TimelinePreviewResolvedSegment[][]
  >([]);
  const [redoStack, setRedoStack] = React.useState<
    TimelinePreviewResolvedSegment[][]
  >([]);
  const [currentFrame, setCurrentFrame] = React.useState(0);
  const pendingSeekFrameRef = React.useRef<number | null>(null);
  const currentFrameRef = React.useRef(currentFrame);
  currentFrameRef.current = currentFrame;
  const resizeHistoryCapturedRef = React.useRef(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isFavoriting, setIsFavoriting] = React.useState(false);
  const [regeneratingField, setRegeneratingField] =
    React.useState<ReelTextRegenerationField | null>(null);
  const [isDownloadStarting, setIsDownloadStarting] = React.useState(false);
  const [downloadProgress, setDownloadProgress] = React.useState(0);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = React.useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = React.useState(false);
  const [isAddClipOpen, setIsAddClipOpen] = React.useState(false);
  const [activeAddClipTab, setActiveAddClipTab] = React.useState<
    "room_clips" | "user_media"
  >("room_clips");
  const [timelineScrollToEndNonce, setTimelineScrollToEndNonce] =
    React.useState(0);
  const [userMediaScrollRoot, setUserMediaScrollRoot] =
    React.useState<HTMLDivElement | null>(null);
  const [activeExport, setActiveExport] = React.useState<{
    exportId: string;
    filenameBase: string;
    quality: ListingReelExportQuality;
  } | null>(null);
  const selectedPreviewRef = React.useRef(selectedPreview);
  selectedPreviewRef.current = selectedPreview;
  const startedArtifactDownloadRef = React.useRef<string | null>(null);

  const pickerEnabled =
    Boolean(selectedPreview) &&
    isAddClipOpen &&
    activeAddClipTab === "user_media";

  const {
    items: userMediaPickerItems,
    errorMessage: userMediaPickerError,
    isInitialLoading: userMediaPickerInitialLoading,
    isLoadingMore: userMediaPickerLoadingMore,
    loadMoreRef: userMediaPickerLoadMoreRef,
    retry: userMediaPickerRetry
  } = useUserMediaReelPickerInfinite({
    enabled: pickerEnabled,
    scrollRoot: userMediaScrollRoot
  });

  React.useEffect(() => {
    setIsAddClipOpen(false);
    setActiveAddClipTab("room_clips");
    setUserMediaScrollRoot(null);
    setIsExitConfirmOpen(false);
    setTimelineScrollToEndNonce(0);
  }, [selectedPreview?.id]);

  // Reset drafts only when the user opens a different preview. `selectedPreview` is a new object
  // whenever the parent recomputes `playablePlans` (e.g. after a server action / router refresh), so
  // depending on the whole object would wipe reel state when switching to User Media or paging.
  React.useEffect(() => {
    const preview = selectedPreviewRef.current;
    if (!preview) {
      return;
    }
    setHookDraft(preview.captionItem?.hook ?? "");
    setCaptionDraft(preview.captionItem?.caption ?? "");
    setOverlayDraft(seedOverlayDraftFromPreview(preview));
    setSegmentDraft(cloneSegments(preview.resolvedSegments ?? []));
    setUndoStack([]);
    setRedoStack([]);
    setCurrentFrame(0);
    setPlayerInstance(null);
    setIsSaving(false);
    setIsDownloadStarting(false);
    setActiveExport(null);
    setDownloadProgress(0);
    setErrorMessage(null);
    startedArtifactDownloadRef.current = null;
    resizeHistoryCapturedRef.current = false;
  }, [selectedPreview?.id]);

  const handlePlayerRef = React.useCallback((player: PlayerRef | null) => {
    playerRef.current = player;
    setPlayerInstance((currentPlayer) => {
      if (player === null) {
        return currentPlayer;
      }

      return currentPlayer ?? player;
    });
  }, []);

  const normalizedHook = hookDraft.trim();
  const normalizedCaption = captionDraft.trim();
  const savedHook = selectedPreview?.captionItem?.hook ?? "";
  const savedCaption = selectedPreview?.captionItem?.caption ?? "";
  const savedOverlayDraft = React.useMemo(
    () => seedOverlayDraftFromPreview(selectedPreview),
    [selectedPreview]
  );
  const savedClipOrderSignature = (selectedPreview?.resolvedSegments ?? [])
    .map((segment) => segment.clipId)
    .join("::");
  const draftClipOrderSignature = segmentDraft
    .map((segment) => segment.clipId)
    .join("::");
  const savedDurationSignature = (selectedPreview?.resolvedSegments ?? [])
    .map((segment) => `${segment.clipId}:${segment.durationSeconds}`)
    .join("::");
  const draftDurationSignature = segmentDraft
    .map((segment) => `${segment.clipId}:${segment.durationSeconds}`)
    .join("::");
  const isDirty =
    normalizedHook !== savedHook.trim() ||
    normalizedCaption !== savedCaption.trim() ||
    overlayDraft.background !== savedOverlayDraft.background ||
    overlayDraft.position !== savedOverlayDraft.position ||
    overlayDraft.fontPairing !== savedOverlayDraft.fontPairing ||
    overlayDraft.showAddress !== savedOverlayDraft.showAddress ||
    draftClipOrderSignature !== savedClipOrderSignature ||
    draftDurationSignature !== savedDurationSignature;

  const handleCancel = React.useCallback(() => {
    const preview = selectedPreviewRef.current;
    setHookDraft(preview?.captionItem?.hook ?? "");
    setCaptionDraft(preview?.captionItem?.caption ?? "");
    setOverlayDraft(seedOverlayDraftFromPreview(preview));
    setSegmentDraft(cloneSegments(preview?.resolvedSegments ?? []));
    setUndoStack([]);
    setRedoStack([]);
    setErrorMessage(null);
    resizeHistoryCapturedRef.current = false;
  }, []);

  const requestClose = React.useCallback(() => {
    if (isDirty) {
      setIsExitConfirmOpen(true);
      return;
    }

    onOpenChange(false);
  }, [isDirty, onOpenChange]);

  const handleDialogOpenChange = React.useCallback(
    (open: boolean) => {
      if (open) {
        onOpenChange(true);
        return;
      }

      requestClose();
    },
    [onOpenChange, requestClose]
  );

  const handleDiscardAndClose = React.useCallback(() => {
    handleCancel();
    setIsExitConfirmOpen(false);
    onOpenChange(false);
  }, [handleCancel, onOpenChange]);

  React.useEffect(() => {
    if (!selectedPreviewRef.current) {
      return;
    }

    setSegmentDraft((currentSegments) =>
      applyOverlayDraftToSegments({
        segments: currentSegments,
        hookText: hookDraft,
        overlayDraft,
        previewContext: selectedPreviewRef.current
      })
    );
  }, [hookDraft, overlayDraft, selectedPreview?.id]);

  const pushTimelineHistory = React.useCallback(
    (currentSegments: TimelinePreviewResolvedSegment[]) => {
      setUndoStack((prev) => [...prev, cloneSegments(currentSegments)]);
      setRedoStack([]);
    },
    []
  );

  const handleSegmentsReorder = React.useCallback(
    (fromIndex: number, toIndex: number) => {
      setSegmentDraft((prev) => {
        if (
          fromIndex === toIndex ||
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= prev.length ||
          toIndex >= prev.length
        ) {
          return prev;
        }

        pushTimelineHistory(prev);
        const next = [...prev];
        const [movedSegment] = next.splice(fromIndex, 1);
        if (!movedSegment) {
          return prev;
        }
        next.splice(toIndex, 0, movedSegment);
        return next;
      });
    },
    [pushTimelineHistory]
  );

  const handleDeleteSegment = React.useCallback(
    (index: number) => {
      pendingSeekFrameRef.current = currentFrame;
      setSegmentDraft((prev) => {
        if (prev.length <= 1 || index < 0 || index >= prev.length) {
          return prev;
        }

        pushTimelineHistory(prev);
        return prev.filter((_, segmentIndex) => segmentIndex !== index);
      });
    },
    [currentFrame, pushTimelineHistory]
  );

  const deletedClipOptions = React.useMemo(() => {
    const currentClipIds = new Set(segmentDraft.map(getSegmentSourceKey));
    return (selectedPreview?.resolvedSegments ?? []).filter(
      (segment) => !currentClipIds.has(getSegmentSourceKey(segment))
    );
  }, [segmentDraft, selectedPreview]);

  /** Full rows for add-segment lookup; not filtered by timeline membership. */
  const userMediaPickerRows = React.useMemo(() => {
    return userMediaPickerItems
      .filter((item) => Boolean(item.videoUrl))
      .map<
        TimelinePreviewResolvedSegment & {
          label: string;
          fileName: string | null;
        }
      >((item, index) => ({
        clipId: item.id,
        sourceType: "user_media" as const,
        sourceId: item.id.replace(/^user-media:/, ""),
        src: item.videoUrl ?? "",
        thumbnailSrc: item.thumbnail ?? null,
        category: item.category ?? null,
        durationSeconds: Math.min(item.durationSeconds ?? 3, 3),
        maxDurationSeconds: Math.max(0.5, item.durationSeconds ?? 3),
        label: item.alt?.trim() || `User Media ${index + 1}`,
        fileName: extractFileNameFromVideoUrl(item.videoUrl)
      }));
  }, [userMediaPickerItems]);

  const userMediaClipOptions = React.useMemo(() => {
    const currentClipIds = new Set(segmentDraft.map(getSegmentSourceKey));
    return userMediaPickerRows
      .filter((row) => !currentClipIds.has(`user_media:${row.sourceId}`))
      .map((row) => ({
        clipId: row.clipId,
        thumbnailSrc: row.thumbnailSrc,
        label: row.label,
        fileName: row.fileName
      }));
  }, [segmentDraft, userMediaPickerRows]);

  const handleAddSegment = React.useCallback(
    (clipId: string) => {
      let didAppend = false;
      setSegmentDraft((prev) => {
        const preview = selectedPreviewRef.current;
        const nextSegment =
          (preview?.resolvedSegments ?? []).find(
            (segment) => segment.clipId === clipId
          ) ?? userMediaPickerRows.find((segment) => segment.clipId === clipId);
        if (!nextSegment || prev.some((segment) => segment.clipId === clipId)) {
          return prev;
        }

        const sharedTextOverlay =
          getSharedTextOverlay(prev) ??
          getSharedTextOverlay(preview?.resolvedSegments ?? []);
        const sharedSupplementalAddressOverlay =
          getSharedSupplementalAddressOverlay(prev) ??
          getSharedSupplementalAddressOverlay(preview?.resolvedSegments ?? []);

        didAppend = true;
        pushTimelineHistory(prev);
        return [
          ...prev,
          {
            ...nextSegment,
            textOverlay:
              nextSegment.textOverlay ?? sharedTextOverlay ?? undefined,
            supplementalAddressOverlay:
              nextSegment.supplementalAddressOverlay ??
              sharedSupplementalAddressOverlay,
            sourceType: nextSegment.sourceType ?? "listing_clip",
            sourceId: nextSegment.sourceId ?? nextSegment.clipId
          }
        ];
      });
      if (didAppend) {
        pendingSeekFrameRef.current = Number.POSITIVE_INFINITY;
        setTimelineScrollToEndNonce((n) => n + 1);
      }
    },
    [pushTimelineHistory, userMediaPickerRows]
  );

  const buildDraftPayload =
    React.useCallback((): PlayablePreviewTextUpdate | null => {
      const preview = selectedPreviewRef.current;
      if (!preview?.captionItemKey) {
        return null;
      }

      return {
        hook: normalizedHook,
        caption: normalizedCaption,
        overlayBackground: overlayDraft.background,
        overlayPosition: overlayDraft.position,
        overlayFontPairing: overlayDraft.fontPairing,
        showAddress: overlayDraft.showAddress,
        orderedClipIds: segmentDraft.map((segment) => segment.clipId),
        clipDurationOverrides: Object.fromEntries(
          segmentDraft.map((segment) => [
            segment.clipId,
            segment.durationSeconds
          ])
        ),
        sequence: segmentDraft.map((segment) => ({
          sourceType: segment.sourceType ?? "listing_clip",
          sourceId: segment.sourceId ?? segment.clipId,
          durationSeconds: segment.durationSeconds
        })),
        saveTarget: preview.captionItemKey
      };
    }, [
      normalizedCaption,
      normalizedHook,
      overlayDraft.background,
      overlayDraft.fontPairing,
      overlayDraft.position,
      overlayDraft.showAddress,
      segmentDraft
    ]);

  const buildExportPayload = React.useCallback(
    (quality: ListingReelExportQuality): ListingReelExportRequest => ({
      filenameBase: `reel-preview-${selectedPreviewRef.current?.variationNumber ?? 1}`,
      quality,
      segments: segmentDraft.map((segment) => ({
        sourceType: segment.sourceType ?? "listing_clip",
        sourceId: segment.sourceId ?? segment.clipId,
        durationSeconds: segment.durationSeconds,
        textOverlay: segment.textOverlay ?? null,
        supplementalAddressOverlay: segment.supplementalAddressOverlay ?? null
      }))
    }),
    [segmentDraft]
  );

  const handleSave = React.useCallback(async () => {
    const payload = buildDraftPayload();
    if (!payload) {
      setErrorMessage("This preview cannot be edited yet.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await onSavePreviewText(payload);
      handleCancel();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save preview text."
      );
    } finally {
      setIsSaving(false);
    }
  }, [buildDraftPayload, handleCancel, onSavePreviewText]);

  const handleSaveAndFavorite = React.useCallback(async () => {
    const payload = buildDraftPayload();
    if (!payload || !onSaveAndFavoritePreview) {
      setErrorMessage("This preview cannot be edited yet.");
      return;
    }

    setIsFavoriting(true);
    setErrorMessage(null);

    try {
      await onSaveAndFavoritePreview(payload);
      handleCancel();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to favorite preview."
      );
    } finally {
      setIsFavoriting(false);
    }
  }, [buildDraftPayload, handleCancel, onSaveAndFavoritePreview]);

  const handleRegenerateField = React.useCallback(
    async (
      targetField: ReelTextRegenerationField,
      mode: RegenerateListingVideoReelTextParams["mode"],
      customDirections?: string
    ) => {
      if (!onRegeneratePreviewText) {
        return;
      }

      const payload = buildDraftPayload();
      if (!payload) {
        setErrorMessage("This preview cannot be edited yet.");
        return;
      }

      setRegeneratingField(targetField);
      setErrorMessage(null);

      try {
        const result = await onRegeneratePreviewText({
          targetField,
          mode,
          customDirections,
          currentHook: payload.hook,
          currentCaption: payload.caption,
          orderedClipIds: payload.orderedClipIds,
          sequence: payload.sequence,
          saveTarget: payload.saveTarget
        });

        if (result.targetField === "hook") {
          setHookDraft(result.value);
        } else {
          setCaptionDraft(result.value);
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to regenerate reel text."
        );
      } finally {
        setRegeneratingField((current) =>
          current === targetField ? null : current
        );
      }
    },
    [buildDraftPayload, onRegeneratePreviewText]
  );

  const usesExternalDownloadState = typeof onDownloadPreview === "function";
  const isDownloading =
    downloadState?.isDownloading ??
    (isDownloadStarting || activeExport !== null);

  const exportStatusPath =
    !usesExternalDownloadState && listingId && activeExport
      ? `/api/v1/listings/${listingId}/reels/exports/${activeExport.exportId}`
      : null;

  const { data: exportStatus } = useSWR(
    exportStatusPath,
    (url: string) =>
      fetchApiData<ListingReelExportJob>(
        url,
        { cache: "no-store" },
        "Failed to load reel export status."
      ),
    {
      refreshInterval: (latestData) => {
        if (!activeExport) {
          return 0;
        }

        const status = (latestData as ListingReelExportJob | undefined)?.status;
        return status === "completed" ||
          status === "failed" ||
          status === "canceled"
          ? 0
          : REEL_EXPORT_POLL_INTERVAL_MS;
      },
      revalidateOnFocus: false,
      refreshWhenHidden: true,
      shouldRetryOnError: false,
      dedupingInterval: 0
    }
  );

  const localDownloadStatus: ListingReelExportStatus | "starting" | null =
    activeExport
      ? (exportStatus?.status ?? (isDownloadStarting ? "starting" : "queued"))
      : isDownloadStarting
        ? "starting"
        : null;
  const downloadStatus = downloadState?.status ?? localDownloadStatus;
  const isQueuedDownload = downloadStatus === "queued";
  const downloadQuality = downloadState?.quality ?? activeExport?.quality;
  const downloadStatusLabel = getDownloadStatusLabel(
    downloadStatus,
    downloadQuality
  );

  const downloadArtifact = React.useCallback(
    async (exportJob: { exportId: string; filenameBase: string }) => {
      if (!listingId) {
        throw new Error("This preview cannot be downloaded yet.");
      }

      const response = await fetchStreamResponse(
        `/api/v1/listings/${listingId}/reels/exports/${exportJob.exportId}/download?filenameBase=${encodeURIComponent(exportJob.filenameBase)}`,
        undefined,
        "Failed to download reel preview."
      );

      const blob = await readReelDownloadBlob(response, (progress) => {
        setDownloadProgress((current) =>
          Math.max(current, clampReelDownloadProgress(progress))
        );
      });
      setDownloadProgress(1);
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
      setActiveExport(null);
      setIsDownloadStarting(false);
    },
    [listingId]
  );

  React.useEffect(() => {
    if (!activeExport || !exportStatus) {
      return;
    }

    if (
      exportStatus.status === "queued" ||
      exportStatus.status === "upscaling" ||
      exportStatus.status === "rendering"
    ) {
      setDownloadProgress((current) =>
        Math.max(current, clampReelDownloadProgress(exportStatus.progress))
      );
      return;
    }

    if (exportStatus.status === "completed" && exportStatus.downloadReady) {
      setDownloadProgress(1);
      if (startedArtifactDownloadRef.current === activeExport.exportId) {
        return;
      }

      startedArtifactDownloadRef.current = activeExport.exportId;
      void downloadArtifact(activeExport).catch((error) => {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to download reel preview.";
        setErrorMessage(message);
        toast.error(message);
        setActiveExport(null);
        setIsDownloadStarting(false);
      });
      return;
    }

    if (
      exportStatus.status === "failed" ||
      exportStatus.status === "canceled"
    ) {
      const message =
        exportStatus.errorMessage ??
        (exportStatus.status === "canceled"
          ? "Reel export was canceled."
          : "Failed to download reel preview.");
      setErrorMessage(message);
      toast.error(message);
      setActiveExport(null);
      setIsDownloadStarting(false);
      setDownloadProgress(0);
      startedArtifactDownloadRef.current = null;
    }
  }, [activeExport, downloadArtifact, exportStatus]);

  const handleDownload = React.useCallback(
    async (quality: ListingReelExportQuality) => {
      if (usesExternalDownloadState) {
        const exportPayload = buildExportPayload(quality);
        setErrorMessage(null);
        await onDownloadPreview?.(exportPayload);
        return;
      }

      if (!listingId) {
        setErrorMessage("This preview cannot be downloaded yet.");
        return;
      }

      if (isDownloading) {
        return;
      }

      setIsDownloadMenuOpen(false);
      setIsDownloadStarting(true);
      setDownloadProgress(0);
      setErrorMessage(null);
      toast("Started downloading reel preview.");

      try {
        const exportPayload = buildExportPayload(quality);
        const response = await fetchApiData<ListingReelExportJob>(
          `/api/v1/listings/${listingId}/reels/exports`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(exportPayload)
          },
          "Failed to start reel export."
        );
        startedArtifactDownloadRef.current = null;
        setActiveExport({
          exportId: response.exportId,
          filenameBase: exportPayload.filenameBase ?? "reel-preview",
          quality
        });
        setDownloadProgress(clampReelDownloadProgress(response.progress));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to download reel preview.";
        setErrorMessage(message);
        toast.error(message);
      } finally {
        setIsDownloadStarting(false);
      }
    },
    [
      buildExportPayload,
      isDownloading,
      listingId,
      onDownloadPreview,
      usesExternalDownloadState
    ]
  );

  const downloadProgressPercent = React.useMemo(
    () =>
      Math.round(
        clampReelDownloadProgress(downloadState?.progress ?? downloadProgress) *
          100
      ),
    [downloadProgress, downloadState?.progress]
  );

  const draftDurationInFrames = React.useMemo(
    () => getTimelineDurationInFrames(segmentDraft, previewFps),
    [previewFps, segmentDraft]
  );

  /** Clip identity + order; excludes duration-only edits (resize) so pending-seek effect does not run every drag tick. */
  const segmentClipIdsKey = React.useMemo(
    () => segmentDraft.map((s) => s.clipId).join("::"),
    [segmentDraft]
  );

  const handleSegmentDurationChange = React.useCallback(
    (index: number, durationSeconds: number) => {
      // Do not set pendingSeekFrameRef here: resize fires many updates per second; pairing that
      // with the pending-seek effect + Remotion Player caused maximum update depth when dragging.
      setSegmentDraft((prev) => {
        const currentSegment = prev[index];
        if (
          !currentSegment ||
          currentSegment.durationSeconds === durationSeconds
        ) {
          return prev;
        }

        if (!resizeHistoryCapturedRef.current) {
          pushTimelineHistory(prev);
          resizeHistoryCapturedRef.current = true;
        }

        return prev.map((segment, segmentIndex) =>
          segmentIndex === index ? { ...segment, durationSeconds } : segment
        );
      });
    },
    [pushTimelineHistory]
  );

  const handleDurationChangeStart = React.useCallback(() => {
    resizeHistoryCapturedRef.current = false;
  }, []);

  const handleDurationChangeEnd = React.useCallback(() => {
    resizeHistoryCapturedRef.current = false;
  }, []);

  const handleUndoTimelineChange = React.useCallback(() => {
    setUndoStack((prevUndoStack) => {
      const previousSegments = prevUndoStack[prevUndoStack.length - 1];
      if (!previousSegments) {
        return prevUndoStack;
      }

      pendingSeekFrameRef.current = currentFrame;
      setRedoStack((prevRedoStack) => [
        ...prevRedoStack,
        cloneSegments(segmentDraft)
      ]);
      setSegmentDraft(cloneSegments(previousSegments));
      resizeHistoryCapturedRef.current = false;
      return prevUndoStack.slice(0, -1);
    });
  }, [currentFrame, segmentDraft]);

  const handleRedoTimelineChange = React.useCallback(() => {
    setRedoStack((prevRedoStack) => {
      const nextSegments = prevRedoStack[prevRedoStack.length - 1];
      if (!nextSegments) {
        return prevRedoStack;
      }

      pendingSeekFrameRef.current = currentFrame;
      setUndoStack((prevUndoStack) => [
        ...prevUndoStack,
        cloneSegments(segmentDraft)
      ]);
      setSegmentDraft(cloneSegments(nextSegments));
      resizeHistoryCapturedRef.current = false;
      return prevRedoStack.slice(0, -1);
    });
  }, [currentFrame, segmentDraft]);

  const handleSeekFrame = React.useCallback((frame: number) => {
    playerRef.current?.pause();
    playerRef.current?.seekTo(frame);
    setCurrentFrame(frame);
  }, []);

  React.useEffect(() => {
    const pendingFrame = pendingSeekFrameRef.current;
    if (pendingFrame === null) {
      return;
    }

    pendingSeekFrameRef.current = null;
    const nextFrame =
      pendingFrame === Number.POSITIVE_INFINITY
        ? draftDurationInFrames
        : Math.min(pendingFrame, draftDurationInFrames);
    playerRef.current?.seekTo(nextFrame);
    setCurrentFrame(nextFrame);
  }, [draftDurationInFrames, segmentClipIdsKey]);

  /**
   * After the composition length changes (resize), re-seek the Remotion player so it stays aligned
   * with React state (and clamp when the playhead would exceed the new duration). Runs only when
   * `draftDurationInFrames` changes — not on every `segmentDraft` edit — to avoid update-depth loops.
   */
  React.useLayoutEffect(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }
    const f = currentFrameRef.current;
    const clamped = Math.min(f, draftDurationInFrames);
    player.seekTo(clamped);
    if (clamped !== f) {
      setCurrentFrame(clamped);
    }
  }, [draftDurationInFrames]);

  React.useEffect(() => {
    const player = playerInstance;
    if (!player) {
      return;
    }

    const syncFrame = (event: { detail: { frame: number } }) => {
      setCurrentFrame(event.detail.frame);
    };
    const handleEnded = () => {
      setCurrentFrame(draftDurationInFrames);
    };

    player.addEventListener("frameupdate", syncFrame);
    player.addEventListener("seeked", syncFrame);
    player.addEventListener("timeupdate", syncFrame);
    player.addEventListener("ended", handleEnded);

    return () => {
      player.removeEventListener("frameupdate", syncFrame);
      player.removeEventListener("seeked", syncFrame);
      player.removeEventListener("timeupdate", syncFrame);
      player.removeEventListener("ended", handleEnded);
    };
  }, [draftDurationInFrames, playerInstance, selectedPreview?.id]);

  React.useEffect(() => {
    const player = playerInstance;
    if (!player || !selectedPreview) {
      return;
    }

    let frameId = 0;
    let cancelled = false;

    const syncFromPlayer = () => {
      if (cancelled) {
        return;
      }

      const nextFrame = player.getCurrentFrame();
      if (typeof nextFrame === "number" && Number.isFinite(nextFrame)) {
        setCurrentFrame(nextFrame);
      }

      frameId = window.requestAnimationFrame(syncFromPlayer);
    };

    syncFromPlayer();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [playerInstance, selectedPreview]);

  return (
    <Dialog
      open={Boolean(selectedPreview)}
      onOpenChange={handleDialogOpenChange}
    >
      <DialogContent
        hideCloseButton
        className="grid max-h-[88vh] w-[96vw] max-w-[calc(100vw-1rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden border-0 p-0 sm:max-w-[calc(100vw-2rem)] min-[1050px]:h-[88vh] min-[1050px]:w-[82vw] min-[1050px]:max-w-[min(1400px,calc(100vw-2rem))]"
      >
        <DialogHeader className="sticky top-0 z-20 flex-row items-center justify-between border-b border-border bg-background/95 px-6 py-4 backdrop-blur supports-backdrop-filter:bg-background/90">
          <DialogTitle>Reel Preview</DialogTitle>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0 rounded-full"
            aria-label="Close"
            onClick={requestClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        {selectedPreview ? (
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden max-[1049px]:overflow-x-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden max-[1049px]:pb-19 min-[1050px]:flex min-[1050px]:min-h-0 min-[1050px]:flex-col min-[1050px]:overflow-hidden min-[1050px]:pb-0">
              <div className="grid min-w-0 max-w-full items-start min-[1050px]:h-full min-[1050px]:min-h-0 min-[1050px]:grid-cols-[minmax(0,1fr)_1px_minmax(0,520px)] min-[1050px]:items-stretch min-[1050px]:overflow-hidden">
                <div className="grid min-w-0 max-w-full content-start min-[1050px]:h-full min-[1050px]:min-h-0 min-[1050px]:grid-rows-[minmax(0,1fr)_1px_248px] min-[1050px]:overflow-hidden">
                  <div
                    data-testid="video-preview-stage"
                    className="relative flex min-h-0 min-w-0 items-center justify-center overflow-hidden bg-secondary px-3 py-4 max-[1049px]:min-h-[min(38dvh,18rem)] min-[1050px]:h-full min-[1050px]:px-0 min-[1050px]:py-0"
                  >
                    <div className="absolute right-3 top-3 z-10 flex gap-2 min-[1050px]:right-4 min-[1050px]:top-4">
                      <DropdownMenu
                        open={isDownloadMenuOpen}
                        onOpenChange={setIsDownloadMenuOpen}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="relative h-8 w-8 rounded-full bg-background text-foreground hover:bg-secondary hover:text-secondary-foreground disabled:opacity-100 dark:bg-input/30 dark:border-input dark:hover:bg-input/50"
                                aria-label="Download reel preview"
                                disabled={
                                  isSaving || isFavoriting || isDownloading
                                }
                              >
                                {isDownloading && !isQueuedDownload ? (
                                  <span
                                    data-testid="reel-download-spinner"
                                    aria-hidden
                                    className="pointer-events-none absolute inset-0 rounded-full border border-primary/20 border-t-primary animate-spin"
                                  />
                                ) : null}
                                {isQueuedDownload ? (
                                  <Hourglass
                                    data-testid="reel-download-queued-icon"
                                    className="relative z-10 h-4 w-4 text-primary"
                                  />
                                ) : isDownloading ? (
                                  <span
                                    data-testid="reel-download-progress-label"
                                    className="relative z-10 text-[9px] font-semibold leading-none text-primary"
                                  >
                                    {downloadProgressPercent}%
                                  </span>
                                ) : (
                                  <Download className="relative z-10 h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="top">Download</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => void handleDownload("standard")}
                            className="flex flex-col items-start gap-0.5"
                          >
                            <span>Standard download</span>
                            <span className="text-xs text-muted-foreground">
                              Estimated time: 1-2 minutes
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => void handleDownload("premium")}
                            className="flex flex-col items-start gap-0.5"
                          >
                            <span>Premium 4K download</span>
                            <span className="text-xs text-muted-foreground">
                              Estimated time: 3-4 minutes
                            </span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 rounded-full bg-background text-foreground hover:bg-secondary hover:text-secondary-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50"
                            aria-label="Favorite reel preview"
                            disabled={isSaving || isFavoriting}
                            onClick={() => void handleSaveAndFavorite()}
                          >
                            <Heart className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Favorite</TooltipContent>
                      </Tooltip>
                    </div>
                    {isDownloading && downloadStatusLabel ? (
                      <div className="absolute left-3 top-3 z-10 rounded-full bg-background/95 px-3 py-1 text-[11px] font-medium text-foreground shadow-sm min-[1050px]:left-4 min-[1050px]:top-4">
                        {downloadStatusLabel}
                      </div>
                    ) : null}
                    <div
                      data-testid="video-player-shell"
                      className="relative mx-auto aspect-9/16 w-full min-w-[148px] max-w-[min(160px,calc(100vw-5rem))] overflow-hidden rounded-xl bg-card shadow-sm min-[1050px]:h-[86%] min-[1050px]:max-h-full min-[1050px]:w-auto min-[1050px]:max-w-full"
                    >
                      <VideoPreviewPlayer
                        key={selectedPreview.id}
                        playerRef={handlePlayerRef}
                        segments={segmentDraft}
                        durationInFrames={draftDurationInFrames}
                        previewFps={previewFps}
                        firstThumb={selectedPreview.firstThumb}
                      />
                    </div>
                  </div>
                  <div className="h-px bg-border" aria-hidden />
                  <div className="min-w-0 max-w-full px-3 py-3 min-[1050px]:flex min-[1050px]:h-[248px] min-[1050px]:min-h-[248px] min-[1050px]:flex-col min-[1050px]:overflow-hidden min-[1050px]:px-4">
                    <VideoPreviewTimeline
                      segments={segmentDraft}
                      stableRoomLabelSegments={
                        selectedPreview?.resolvedSegments ?? undefined
                      }
                      scrollToEndNonce={timelineScrollToEndNonce}
                      deletedClipOptions={deletedClipOptions}
                      userMediaClipOptions={userMediaClipOptions}
                      userMediaVideoCount={userMediaVideoCount}
                      isAddClipPopoverOpen={isAddClipOpen}
                      onAddClipPopoverOpenChange={setIsAddClipOpen}
                      addClipActiveTab={activeAddClipTab}
                      onAddClipActiveTabChange={setActiveAddClipTab}
                      userMediaPickerInitialLoading={
                        userMediaPickerInitialLoading
                      }
                      userMediaPickerLoadingMore={userMediaPickerLoadingMore}
                      userMediaPickerError={userMediaPickerError}
                      userMediaPickerOnRetry={userMediaPickerRetry}
                      userMediaPickerLoadMoreRef={userMediaPickerLoadMoreRef}
                      onUserMediaScrollRoot={setUserMediaScrollRoot}
                      previewFps={previewFps}
                      currentFrame={currentFrame}
                      totalFrames={draftDurationInFrames}
                      onSeekFrame={handleSeekFrame}
                      onReorder={handleSegmentsReorder}
                      onDurationChangeStart={handleDurationChangeStart}
                      onDurationChangeEnd={handleDurationChangeEnd}
                      onDurationChange={handleSegmentDurationChange}
                      onDeleteClip={handleDeleteSegment}
                      onAddClip={handleAddSegment}
                      canUndo={undoStack.length > 0}
                      canRedo={redoStack.length > 0}
                      onUndo={handleUndoTimelineChange}
                      onRedo={handleRedoTimelineChange}
                    />
                  </div>
                </div>
                <div
                  className="hidden h-full self-stretch bg-border min-[1050px]:block"
                  aria-hidden
                />
                <div className="min-w-0 max-w-full border-t border-border min-[1050px]:min-h-0 min-[1050px]:overflow-hidden min-[1050px]:border-t-0">
                  <div className="min-[1050px]:h-full">
                    <VideoPreviewTextEditor
                      hookValue={hookDraft}
                      captionValue={captionDraft}
                      isDirty={isDirty}
                      isSaving={isSaving}
                      errorMessage={errorMessage}
                      onHookChange={setHookDraft}
                      onCaptionChange={setCaptionDraft}
                      onCancel={handleCancel}
                      onSave={() => void handleSave()}
                      overlayDraft={overlayDraft}
                      backgroundOptions={
                        VIDEO_PREVIEW_OVERLAY_BACKGROUND_OPTIONS
                      }
                      fontOptions={VIDEO_PREVIEW_OVERLAY_FONT_OPTIONS}
                      positionOptions={VIDEO_PREVIEW_OVERLAY_POSITION_OPTIONS}
                      onOverlayBackgroundChange={(background) =>
                        setOverlayDraft((current) => ({
                          ...current,
                          background
                        }))
                      }
                      onOverlayFontChange={(fontPairing) =>
                        setOverlayDraft((current) => ({
                          ...current,
                          fontPairing
                        }))
                      }
                      onOverlayPositionChange={(position) =>
                        setOverlayDraft((current) => ({
                          ...current,
                          position
                        }))
                      }
                      onOverlayAddressToggle={(showAddress) =>
                        setOverlayDraft((current) => ({
                          ...current,
                          showAddress
                        }))
                      }
                      hookInputDisabled={regeneratingField === "hook"}
                      captionInputDisabled={regeneratingField === "caption"}
                      hookRegenerateState={
                        onRegeneratePreviewText
                          ? {
                              isSubmitting: regeneratingField === "hook",
                              onRandomRegenerate: () => {
                                void handleRegenerateField("hook", "random");
                              },
                              onCustomRegenerate: (directions) => {
                                void handleRegenerateField(
                                  "hook",
                                  "custom",
                                  directions
                                );
                              }
                            }
                          : undefined
                      }
                      captionRegenerateState={
                        onRegeneratePreviewText
                          ? {
                              isSubmitting: regeneratingField === "caption",
                              onRandomRegenerate: () => {
                                void handleRegenerateField("caption", "random");
                              },
                              onCustomRegenerate: (directions) => {
                                void handleRegenerateField(
                                  "caption",
                                  "custom",
                                  directions
                                );
                              }
                            }
                          : undefined
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 hidden max-[1049px]:block">
              <div className="pointer-events-auto border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/90">
                <VideoPreviewEditorActions
                  isDirty={isDirty}
                  isSaving={isSaving}
                  onCancel={handleCancel}
                  onSave={() => void handleSave()}
                />
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
      <AlertDialog open={isExitConfirmOpen} onOpenChange={setIsExitConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Leave reel preview without saving?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your unsaved reel changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardAndClose}>
              Continue Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
