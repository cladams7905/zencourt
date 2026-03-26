"use client";

import * as React from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { LoadingImage } from "@web/src/components/ui/loading-image";
import {
  ListingTimelinePreviewComposition,
  type TimelinePreviewResolvedSegment
} from "@web/src/components/listings/create/media/video/components/ListingTimelinePreviewComposition";

type VideoPreviewPlayerProps = {
  playerRef: React.Ref<PlayerRef>;
  segments: TimelinePreviewResolvedSegment[];
  durationInFrames: number;
  previewFps: number;
  firstThumb: string | null;
};

export const VideoPreviewPlayer = React.memo(function VideoPreviewPlayer({
  playerRef,
  segments,
  durationInFrames,
  previewFps,
  firstThumb
}: VideoPreviewPlayerProps) {
  const inputProps = React.useMemo(() => ({ segments }), [segments]);

  const renderPoster = React.useCallback(() => {
    if (!firstThumb) {
      return null;
    }

    return (
      <LoadingImage
        src={firstThumb}
        alt="Reel preview"
        fill
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover"
        }}
      />
    );
  }, [firstThumb]);

  return (
    <Player
      ref={playerRef}
      component={ListingTimelinePreviewComposition}
      inputProps={inputProps}
      durationInFrames={durationInFrames}
      compositionWidth={1080}
      compositionHeight={1920}
      fps={previewFps}
      loop
      autoPlay
      controls
      initiallyMuted
      renderPoster={renderPoster}
      showPosterWhenUnplayed
      showPosterWhenBuffering
      showPosterWhenBufferingAndPaused
      style={{ width: "100%", height: "100%" }}
      acknowledgeRemotionLicense
    />
  );
});
