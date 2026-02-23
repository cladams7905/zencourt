import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig, Video } from "remotion";
import { loadFont as loadRougeScript } from "@remotion/google-fonts/RougeScript";
import { loadFont as loadGwendolyn } from "@remotion/google-fonts/Gwendolyn";
import { loadFont as loadTikTokSans } from "@remotion/google-fonts/TikTokSans";
import { loadFont as loadDMSerifText } from "@remotion/google-fonts/DMSerifText";
import { loadFont as loadItaliana } from "@remotion/google-fonts/Italiana";
import { loadFont as loadOnest } from "@remotion/google-fonts/Onest";
import type { PreviewTextOverlay } from "@shared/types/video";
import { PreviewTextOverlayRenderer } from "@shared/utils";

loadRougeScript();
loadGwendolyn();
loadTikTokSans();
loadDMSerifText();
loadItaliana();
loadOnest();

export type ListingClip = {
  src: string;
  durationSeconds: number;
  textOverlay?: PreviewTextOverlay;
};

export type ListingVideoProps = {
  clips: ListingClip[];
  orientation: "vertical" | "landscape";
};

function ClipSequence({
  clip,
  startFrame,
  clipFrames
}: {
  clip: ListingClip;
  startFrame: number;
  clipFrames: number;
}) {
  return (
    <Sequence
      from={startFrame}
      durationInFrames={clipFrames}
    >
      <AbsoluteFill>
        <Video
          src={clip.src}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {clip.textOverlay ? (
          <PreviewTextOverlayRenderer overlay={clip.textOverlay} />
        ) : null}
      </AbsoluteFill>
    </Sequence>
  );
}

export const ListingVideo: React.FC<ListingVideoProps> = ({ clips }) => {
  const { fps } = useVideoConfig();

  let cursor = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {clips.map((clip) => {
        const clipFrames = Math.max(1, Math.round(clip.durationSeconds * fps));
        const startFrame = cursor;
        cursor += clipFrames;

        return (
          <ClipSequence
            key={clip.src}
            clip={clip}
            startFrame={startFrame}
            clipFrames={clipFrames}
          />
        );
      })}
    </AbsoluteFill>
  );
};
