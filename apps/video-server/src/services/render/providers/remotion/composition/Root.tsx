import React from "react";
import { Composition, registerRoot } from "remotion";
import { ListingVideo, type ListingVideoProps } from "./ListingVideo";

export type ListingVideoInputProps = ListingVideoProps;

const FPS = 30;
const PORTRAIT_WIDTH = 1080;
const PORTRAIT_HEIGHT = 1920;
const LANDSCAPE_WIDTH = 1920;
const LANDSCAPE_HEIGHT = 1080;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ListingVideo"
      component={ListingVideo}
      fps={FPS}
      width={PORTRAIT_WIDTH}
      height={PORTRAIT_HEIGHT}
      defaultProps={{
        clips: [],
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
          width: isLandscape ? LANDSCAPE_WIDTH : PORTRAIT_WIDTH,
          height: isLandscape ? LANDSCAPE_HEIGHT : PORTRAIT_HEIGHT,
          props
        };
      }}
    />
  );
};

registerRoot(RemotionRoot);
