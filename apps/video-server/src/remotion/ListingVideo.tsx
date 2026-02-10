import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useVideoConfig,
  Video
} from "remotion";

export type ListingClip = {
  src: string;
  durationSeconds: number;
};

export type ListingVideoProps = {
  clips: ListingClip[];
  transitionDurationSeconds: number;
  // orientation is used by calculateMetadata in index.tsx for dimension calculation
  orientation?: "vertical" | "landscape";
};

export const ListingVideo: React.FC<ListingVideoProps> = ({ clips }) => {
  const { fps } = useVideoConfig();

  let cursor = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {clips.map((clip, index) => {
        const clipFrames = Math.max(1, Math.round(clip.durationSeconds * fps));
        const startFrame = cursor;
        cursor += clipFrames;

        return (
          <Sequence
            key={`${clip.src}-${index}`}
            from={startFrame}
            durationInFrames={clipFrames}
          >
            <AbsoluteFill>
              <Video src={clip.src} />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
