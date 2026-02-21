import * as React from "react";
import { Player } from "@remotion/player";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@web/src/components/ui/dialog";
import { LoadingImage } from "@web/src/components/ui/loading-image";
import { ListingTimelinePreviewComposition } from "@web/src/components/listings/create/media/video/components/ListingTimelinePreviewComposition";
import type { PlayablePreview } from "@web/src/components/listings/create/shared/types";

type VideoPreviewModalProps = {
  selectedPreview: PlayablePreview | null;
  captionSubcategoryLabel: string;
  previewFps: number;
  onOpenChange: (open: boolean) => void;
};

export function VideoPreviewModal({
  selectedPreview,
  captionSubcategoryLabel,
  previewFps,
  onOpenChange
}: VideoPreviewModalProps) {
  return (
    <Dialog open={Boolean(selectedPreview)} onOpenChange={onOpenChange}>
      <DialogContent className="h-[80vh] w-[60vw] max-w-[calc(100vw-2rem)] sm:max-w-[1600px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Reel Preview</DialogTitle>
        </DialogHeader>
        {selectedPreview ? (
          <div className="grid h-full min-h-0 gap-6 md:grid-cols-[minmax(0,1fr)_490px]">
            <div className="flex min-h-0 items-center justify-center overflow-hidden rounded-lg bg-card">
              <div className="relative h-full aspect-9/16 w-auto">
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
            <div className="min-h-0 overflow-y-auto rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {captionSubcategoryLabel} Caption · Variation{" "}
                {selectedPreview.variationNumber}
              </p>
              <div className="mt-4 space-y-4">
                {selectedPreview.captionItem?.hook ? (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Hook
                    </p>
                    <p className="text-sm text-foreground">
                      {selectedPreview.captionItem.hook}
                    </p>
                  </div>
                ) : null}

                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Caption
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-foreground">
                    {selectedPreview.captionItem?.caption?.trim()
                      ? selectedPreview.captionItem.caption
                      : "No caption available yet for this subcategory."}
                  </p>
                </div>

                {selectedPreview.captionItem?.body?.length ? (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Slide Notes
                    </p>
                    <div className="mt-2 space-y-2">
                      {selectedPreview.captionItem.body.map((slide, index) => (
                        <p
                          key={`${selectedPreview.captionItem?.id}-slide-${index}`}
                          className="text-xs text-muted-foreground"
                        >
                          {index + 1}. {slide.header}: {slide.content}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
