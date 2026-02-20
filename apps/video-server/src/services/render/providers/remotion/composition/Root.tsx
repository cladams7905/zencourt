import React from "react";
import { Composition, registerRoot } from "remotion";
import { ListingVideo, type ListingVideoProps } from "./ListingVideo";

export type ListingVideoInputProps = ListingVideoProps;

const FPS = 30;
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
        transitionDurationSeconds: 0,
        orientation: "vertical"
      }}
      calculateMetadata={({ props }) => {
        const totalFrames = props.clips.reduce((acc, clip) => {
          return acc + Math.max(1, Math.round(clip.durationSeconds * FPS));
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
