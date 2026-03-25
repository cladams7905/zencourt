import * as React from "react";
import { Player } from "@remotion/player";
import { X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@web/src/components/ui/dialog";
import { Button } from "@web/src/components/ui/button";
import { LoadingImage } from "@web/src/components/ui/loading-image";
import { ListingTimelinePreviewComposition } from "@web/src/components/listings/create/media/video/components/ListingTimelinePreviewComposition";
import { VideoPreviewTextEditor } from "@web/src/components/listings/create/media/video/components/VideoPreviewTextEditor";
import { VideoPreviewTimeline } from "@web/src/components/listings/create/media/video/components/VideoPreviewTimeline";
import type {
  PlayablePreview,
  PlayablePreviewTextUpdate
} from "@web/src/components/listings/create/shared/types";

type VideoPreviewModalProps = {
  selectedPreview: PlayablePreview | null;
  captionSubcategoryLabel: string;
  previewFps: number;
  onOpenChange: (open: boolean) => void;
  onSavePreviewText: (params: PlayablePreviewTextUpdate) => Promise<void>;
};

export function VideoPreviewModal({
  selectedPreview,
  captionSubcategoryLabel,
  previewFps,
  onOpenChange,
  onSavePreviewText
}: VideoPreviewModalProps) {
  const [hookDraft, setHookDraft] = React.useState("");
  const [captionDraft, setCaptionDraft] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setHookDraft(selectedPreview?.captionItem?.hook ?? "");
    setCaptionDraft(selectedPreview?.captionItem?.caption ?? "");
    setIsSaving(false);
    setErrorMessage(null);
  }, [selectedPreview]);

  const normalizedHook = hookDraft.trim();
  const normalizedCaption = captionDraft.trim();
  const savedHook = selectedPreview?.captionItem?.hook ?? "";
  const savedCaption = selectedPreview?.captionItem?.caption ?? "";
  const isDirty =
    normalizedHook !== savedHook.trim() ||
    normalizedCaption !== savedCaption.trim();

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
    setErrorMessage(null);
  }, [selectedPreview]);

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
        captionItemKey: selectedPreview.captionItemKey
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
    selectedPreview
  ]);

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
              <div className="grid min-w-0 content-start xl:h-full xl:min-h-0 xl:grid-rows-[minmax(0,1fr)_1px_180px] xl:overflow-hidden">
                <div className="flex min-h-0 min-w-0 items-center justify-center overflow-hidden bg-secondary xl:h-full">
                  <div
                    data-testid="video-player-shell"
                    className="relative aspect-9/16 w-full max-w-[320px] lg:max-w-[360px] xl:h-[92%] xl:max-h-full xl:w-auto xl:max-w-full"
                  >
                    <Player
                      component={ListingTimelinePreviewComposition}
                      inputProps={{
                        segments: selectedPreview.resolvedSegments
                      }}
                      durationInFrames={selectedPreview.durationInFrames}
                      compositionWidth={1080}
                      compositionHeight={1920}
                      fps={previewFps}
                      loop
                      autoPlay
                      controls
                      initiallyMuted
                      renderPoster={() =>
                        selectedPreview.firstThumb ? (
                          <LoadingImage
                            src={selectedPreview.firstThumb}
                            alt="Reel preview"
                            fill
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover"
                            }}
                          />
                        ) : null
                      }
                      showPosterWhenUnplayed
                      showPosterWhenBuffering
                      showPosterWhenBufferingAndPaused
                      style={{ width: "100%", height: "100%" }}
                      acknowledgeRemotionLicense
                    />
                  </div>
                </div>
                <div className="h-px bg-border" aria-hidden />
                <div className="px-4 py-3 xl:flex xl:h-[180px] xl:min-h-[180px] xl:flex-col xl:overflow-hidden">
                  <VideoPreviewTimeline
                    segments={selectedPreview.resolvedSegments}
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
                    captionSubcategoryLabel={captionSubcategoryLabel}
                    variationNumber={selectedPreview.variationNumber}
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
