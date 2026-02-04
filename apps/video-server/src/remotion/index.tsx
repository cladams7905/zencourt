import React from "react";
import { Composition, registerRoot } from "remotion";
import { ListingVideo, type ListingVideoProps } from "./ListingVideo";

// Re-export for external use with required orientation
export type ListingVideoInputProps = Required<ListingVideoProps>;

const FPS = 30;
const TRANSITION_DEFAULT_SECONDS = 0.5;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ListingVideo"
      component={ListingVideo}
      fps={FPS}
      width={720}
      height={1280}
      defaultProps={{
        clips: [],
        transitionDurationSeconds: TRANSITION_DEFAULT_SECONDS,
        orientation: "vertical"
      }}
      calculateMetadata={({ props }) => {
        const transitionFrames = Math.max(
          1,
          Math.round(props.transitionDurationSeconds * FPS)
        );
        const totalFrames = props.clips.reduce((acc, clip, index) => {
          const clipFrames = Math.max(1, Math.round(clip.durationSeconds * FPS));
          if (index === 0) {
            return clipFrames;
          }
          return acc + clipFrames - transitionFrames;
        }, 0);

        const isLandscape = props.orientation === "landscape";
        return {
          durationInFrames: Math.max(1, totalFrames),
          fps: FPS,
          width: isLandscape ? 1280 : 720,
          height: isLandscape ? 720 : 1280,
          props
        };
      }}
    />
  );
};

registerRoot(RemotionRoot);
