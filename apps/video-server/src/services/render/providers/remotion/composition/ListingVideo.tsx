import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, useVideoConfig } from "remotion";
import { loadFont as loadRougeScript } from "@remotion/google-fonts/RougeScript";
import { loadFont as loadGwendolyn } from "@remotion/google-fonts/Gwendolyn";
import { loadFont as loadOpenSans } from "@remotion/google-fonts/OpenSans";
import { loadFont as loadDMSerifText } from "@remotion/google-fonts/DMSerifText";
import { loadFont as loadNotoSerifDisplay } from "@remotion/google-fonts/NotoSerifDisplay";
import { loadFont as loadOnest } from "@remotion/google-fonts/Onest";
import { loadFont as loadPlusJakartaSans } from "@remotion/google-fonts/PlusJakartaSans";
import type { PreviewTextOverlay } from "@shared/types/video";
import {
  PreviewTextOverlayRenderer
} from "../../../../../../../../packages/shared/utils/textOverlay/components/PreviewTextOverlayRenderer";
import {
  PREVIEW_TEXT_OVERLAY_LAYOUT,
  PREVIEW_TEXT_OVERLAY_POSITION_TOP
} from "../../../../../../../../packages/shared/utils/textOverlay/assets/layout";

const PREMOUNT_FRAMES = 15;
const POSTMOUNT_FRAMES = 5;

loadRougeScript("normal", {
  weights: ["400"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true
});
loadGwendolyn("normal", {
  weights: ["700"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true
});
loadOpenSans("normal", {
  weights: ["600", "700"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true
});
loadDMSerifText("normal", {
  weights: ["400"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true
});
loadNotoSerifDisplay("normal", {
  weights: ["400"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true
});
loadOnest("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true
});
loadPlusJakartaSans("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true
});

export type ListingClip = {
  src: string;
  durationSeconds: number;
  textOverlay?: PreviewTextOverlay;
  supplementalAddressOverlay?: {
    overlay: PreviewTextOverlay;
    placement: "bottom-third" | "below-primary" | "low-bottom";
  } | null;
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
      premountFor={PREMOUNT_FRAMES}
      postmountFor={POSTMOUNT_FRAMES}
    >
      <AbsoluteFill>
        <OffthreadVideo
          src={clip.src}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {clip.textOverlay ? (
          <PreviewTextOverlayRenderer overlay={clip.textOverlay} />
        ) : null}
        {clip.supplementalAddressOverlay ? (
          <PreviewTextOverlayRenderer
            overlay={clip.supplementalAddressOverlay.overlay}
            topOverride={
              clip.supplementalAddressOverlay.placement === "below-primary"
                ? "79%"
                : clip.supplementalAddressOverlay.placement === "low-bottom"
                  ? "84%"
                  : PREVIEW_TEXT_OVERLAY_POSITION_TOP["bottom-third"]
            }
            baseFontSizePxOverride={
              PREVIEW_TEXT_OVERLAY_LAYOUT.video.fontSizePx * 0.58
            }
          />
        ) : null}
      </AbsoluteFill>
    </Sequence>
  );
}

export const ListingVideo: React.FC<ListingVideoProps> = ({ clips }) => {
  const { fps } = useVideoConfig();

  let cursor = 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "black",
        ["--font-body" as string]: '"Plus Jakarta Sans"',
        ["--font-noto-serif-display" as string]: '"Noto Serif Display"',
        ["--font-rouge" as string]: '"Rouge Script"',
        ["--font-gwendolyn" as string]: '"Gwendolyn"',
        ["--font-tiktok" as string]: '"Open Sans"',
        ["--font-dm-serif" as string]: '"DM Serif Text"',
        ["--font-onest" as string]: '"Onest"'
      }}
    >
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
