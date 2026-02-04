import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
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

function getClipStartFrames(
  clips: ListingClip[],
  fps: number,
  transitionFrames: number
): number[] {
  const starts: number[] = [];
  let cursor = 0;

  for (let i = 0; i < clips.length; i += 1) {
    starts.push(cursor);
    const clipFrames = Math.max(1, Math.round(clips[i].durationSeconds * fps));
    cursor += clipFrames;
    if (i < clips.length - 1) {
      cursor -= transitionFrames;
    }
  }

  return starts;
}

export const ListingVideo: React.FC<ListingVideoProps> = ({
  clips,
  transitionDurationSeconds
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const transitionFrames = Math.max(
    1,
    Math.round(transitionDurationSeconds * fps)
  );
  const startFrames = getClipStartFrames(clips, fps, transitionFrames);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {clips.map((clip, index) => {
        const clipFrames = Math.max(
          1,
          Math.round(clip.durationSeconds * fps)
        );
        const startFrame = startFrames[index];
        const isFirst = index === 0;
        const isLast = index === clips.length - 1;
        const localFrame = frame - startFrame;

        let opacity = 1;
        if (!isFirst) {
          opacity = interpolate(
            localFrame,
            [0, transitionFrames],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
        }
        if (!isLast) {
          const fadeOut = interpolate(
            localFrame,
            [clipFrames - transitionFrames, clipFrames],
            [1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          opacity = Math.min(opacity, fadeOut);
        }

        return (
          <Sequence
            key={clip.src}
            from={startFrame}
            durationInFrames={clipFrames}
          >
            <AbsoluteFill style={{ opacity }}>
              <Video src={clip.src} />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
