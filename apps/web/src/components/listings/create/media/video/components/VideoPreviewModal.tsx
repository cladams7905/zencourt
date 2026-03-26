import * as React from "react";
import type { PlayerRef } from "@remotion/player";
import { X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@web/src/components/ui/dialog";
import { Button } from "@web/src/components/ui/button";
import { getTimelineDurationInFrames } from "@web/src/components/listings/create/media/video/components/ListingTimelinePreviewComposition";
import { VideoPreviewPlayer } from "@web/src/components/listings/create/media/video/components/VideoPreviewPlayer";
import { VideoPreviewTextEditor } from "@web/src/components/listings/create/media/video/components/VideoPreviewTextEditor";
import { VideoPreviewTimeline } from "@web/src/components/listings/create/media/video/components/VideoPreviewTimeline";
import type {
  PlayablePreview,
  PlayablePreviewTextUpdate
} from "@web/src/components/listings/create/shared/types";
import type { TimelinePreviewResolvedSegment } from "@web/src/components/listings/create/media/video/components/ListingTimelinePreviewComposition";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";

type VideoPreviewModalProps = {
  selectedPreview: PlayablePreview | null;
  userMediaItems?: ContentItem[];
  previewFps: number;
  onOpenChange: (open: boolean) => void;
  onSavePreviewText: (params: PlayablePreviewTextUpdate) => Promise<void>;
};

function cloneSegments(segments: TimelinePreviewResolvedSegment[]) {
  return segments.map((segment) => ({ ...segment }));
}

function getSegmentSourceKey(segment: TimelinePreviewResolvedSegment): string {
  return `${segment.sourceType ?? "listing_clip"}:${segment.sourceId ?? segment.clipId}`;
}

export function VideoPreviewModal({
  selectedPreview,
  userMediaItems = [],
  previewFps,
  onOpenChange,
  onSavePreviewText
}: VideoPreviewModalProps) {
  const playerRef = React.useRef<PlayerRef | null>(null);
  const [playerInstance, setPlayerInstance] = React.useState<PlayerRef | null>(
    null
  );
  const [hookDraft, setHookDraft] = React.useState("");
  const [captionDraft, setCaptionDraft] = React.useState("");
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
  const resizeHistoryCapturedRef = React.useRef(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setHookDraft(selectedPreview?.captionItem?.hook ?? "");
    setCaptionDraft(selectedPreview?.captionItem?.caption ?? "");
    setSegmentDraft(cloneSegments(selectedPreview?.resolvedSegments ?? []));
    setUndoStack([]);
    setRedoStack([]);
    setCurrentFrame(0);
    setPlayerInstance(null);
    setIsSaving(false);
    setErrorMessage(null);
    resizeHistoryCapturedRef.current = false;
  }, [selectedPreview]);

  const handlePlayerRef = React.useCallback((player: PlayerRef | null) => {
    playerRef.current = player;
    setPlayerInstance((currentPlayer) =>
      currentPlayer === player ? currentPlayer : player
    );
  }, []);

  const normalizedHook = hookDraft.trim();
  const normalizedCaption = captionDraft.trim();
  const savedHook = selectedPreview?.captionItem?.hook ?? "";
  const savedCaption = selectedPreview?.captionItem?.caption ?? "";
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
    draftClipOrderSignature !== savedClipOrderSignature ||
    draftDurationSignature !== savedDurationSignature;

  const slideNotes = (selectedPreview?.captionItem?.body ?? []).map(
    (slide, index) => ({
      key: `${selectedPreview?.captionItem?.id ?? "preview"}-${index}`,
      header: slide.header,
      content: slide.content
    })
  );

  const handleCancel = React.useCallback(() => {
    setHookDraft(selectedPreview?.captionItem?.hook ?? "");
    setCaptionDraft(selectedPreview?.captionItem?.caption ?? "");
    setSegmentDraft(cloneSegments(selectedPreview?.resolvedSegments ?? []));
    setUndoStack([]);
    setRedoStack([]);
    setErrorMessage(null);
    resizeHistoryCapturedRef.current = false;
  }, [selectedPreview]);

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

  const userMediaClipOptions = React.useMemo(() => {
    const currentClipIds = new Set(segmentDraft.map(getSegmentSourceKey));
    return userMediaItems
      .filter((item) => Boolean(item.videoUrl))
      .filter(
        (item) =>
          !currentClipIds.has(
            `user_media:${item.id.replace(/^user-media:/, "")}`
          )
      )
      .map((item, index) => ({
        clipId: item.id,
        sourceType: "user_media" as const,
        sourceId: item.id.replace(/^user-media:/, ""),
        src: item.videoUrl ?? "",
        thumbnailSrc: item.thumbnail ?? null,
        category: item.category ?? null,
        durationSeconds: Math.min(item.durationSeconds ?? 3, 3),
        maxDurationSeconds: Math.max(0.5, item.durationSeconds ?? 3),
        label: item.alt?.trim() || `User Media ${index + 1}`
      }));
  }, [segmentDraft, userMediaItems]);

  const handleAddSegment = React.useCallback(
    (clipId: string) => {
      pendingSeekFrameRef.current = currentFrame;
      setSegmentDraft((prev) => {
        const nextSegment =
          (selectedPreview?.resolvedSegments ?? []).find(
            (segment) => segment.clipId === clipId
          ) ??
          userMediaClipOptions.find((segment) => segment.clipId === clipId);
        if (!nextSegment || prev.some((segment) => segment.clipId === clipId)) {
          return prev;
        }

        pushTimelineHistory(prev);
        return [
          ...prev,
          {
            ...nextSegment,
            sourceType: nextSegment.sourceType ?? "listing_clip",
            sourceId: nextSegment.sourceId ?? nextSegment.clipId
          }
        ];
      });
    },
    [currentFrame, pushTimelineHistory, selectedPreview, userMediaClipOptions]
  );

  const handleSave = React.useCallback(async () => {
    if (!selectedPreview?.captionItemKey) {
      setErrorMessage("This preview cannot be edited yet.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await onSavePreviewText({
        hook: normalizedHook,
        caption: normalizedCaption,
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
        saveTarget: selectedPreview.captionItemKey
      });
      handleCancel();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save preview text."
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    handleCancel,
    normalizedCaption,
    normalizedHook,
    onSavePreviewText,
    segmentDraft,
    selectedPreview
  ]);

  const draftDurationInFrames = React.useMemo(
    () => getTimelineDurationInFrames(segmentDraft, previewFps),
    [previewFps, segmentDraft]
  );

  const handleSegmentDurationChange = React.useCallback(
    (index: number, durationSeconds: number) => {
      pendingSeekFrameRef.current = currentFrame;
      setSegmentDraft((prev) => {
        const currentSegment = prev[index];
        if (!currentSegment || currentSegment.durationSeconds === durationSeconds) {
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
    [currentFrame, pushTimelineHistory]
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
      setRedoStack((prevRedoStack) => [...prevRedoStack, cloneSegments(segmentDraft)]);
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
      setUndoStack((prevUndoStack) => [...prevUndoStack, cloneSegments(segmentDraft)]);
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

    const nextFrame = Math.min(pendingFrame, draftDurationInFrames);
    playerRef.current?.seekTo(nextFrame);
    setCurrentFrame(nextFrame);
    pendingSeekFrameRef.current = null;
  }, [draftDurationInFrames, segmentDraft]);

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
  }, [draftDurationInFrames, playerInstance, selectedPreview]);

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
    <Dialog open={Boolean(selectedPreview)} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="max-h-[88vh] w-[96vw] max-w-[calc(100vw-1rem)] gap-0 overflow-y-auto border-0 p-0 sm:max-w-[calc(100vw-2rem)] xl:h-[88vh] xl:w-[82vw] xl:max-w-[1400px] xl:grid-rows-[auto_minmax(0,1fr)] xl:overflow-hidden"
      >
        <DialogHeader className="sticky top-0 z-20 flex-row items-center justify-between border-b border-border bg-background/95 px-6 py-4 backdrop-blur supports-backdrop-filter:bg-background/90">
          <DialogTitle>Reel Preview</DialogTitle>
          <DialogClose asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0 rounded-full"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>
        {selectedPreview ? (
          <div className="pb-0 xl:min-h-0 xl:overflow-hidden">
            <div className="grid items-start xl:h-full xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_1px_minmax(0,520px)] xl:items-stretch xl:overflow-hidden">
              <div className="grid min-w-0 content-start xl:h-full xl:min-h-0 xl:grid-rows-[minmax(0,1fr)_1px_248px] xl:overflow-hidden">
                <div className="flex min-h-0 min-w-0 items-center justify-center overflow-hidden bg-secondary xl:h-full">
                  <div
                    data-testid="video-player-shell"
                    className="relative aspect-9/16 w-full max-w-[320px] lg:max-w-[360px] xl:h-[86%] xl:max-h-full xl:w-auto xl:max-w-full"
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
                <div className="px-4 py-3 xl:flex xl:h-[248px] xl:min-h-[248px] xl:flex-col xl:overflow-hidden">
                  <VideoPreviewTimeline
                    segments={segmentDraft}
                    totalClipCount={selectedPreview.resolvedSegments.length}
                    deletedClipOptions={deletedClipOptions}
                    userMediaClipOptions={userMediaClipOptions}
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
                className="hidden h-full self-stretch bg-border xl:block"
                aria-hidden
              />
              <div className="min-w-0 border-t border-border xl:min-h-0 xl:overflow-hidden xl:border-t-0">
                <div className="xl:h-full">
                  <VideoPreviewTextEditor
                    hookValue={hookDraft}
                    captionValue={captionDraft}
                    slideNotes={slideNotes}
                    isDirty={isDirty}
                    isSaving={isSaving}
                    errorMessage={errorMessage}
                    onHookChange={setHookDraft}
                    onCaptionChange={setCaptionDraft}
                    onCancel={handleCancel}
                    onSave={() => void handleSave()}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
