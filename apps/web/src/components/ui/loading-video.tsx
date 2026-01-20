"use client";

import * as React from "react";
import { LoadingImage } from "./loading-image";
import { cn } from "./utils";

type LoadingVideoProps = Omit<
  React.ComponentProps<"video">,
  "src" | "poster"
> & {
  videoSrc: string;
  thumbnailSrc?: string | null;
  thumbnailAlt?: string;
  className?: string;
  imageClassName?: string;
  videoClassName?: string;
};

export function LoadingVideo({
  videoSrc,
  thumbnailSrc,
  thumbnailAlt = "Video preview",
  className,
  imageClassName,
  videoClassName,
  ...videoProps
}: LoadingVideoProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        setIsHovered(false);
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current) {
      void videoRef.current.play();
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      className={cn("relative h-full w-full", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {thumbnailSrc ? (
          <LoadingImage
            src={thumbnailSrc}
            alt={thumbnailAlt}
            fill
            sizes="(min-width: 1536px) 22vw, (min-width: 1280px) 26vw, (min-width: 1024px) 32vw, (min-width: 768px) 48vw, 100vw"
            className={cn("object-cover", imageClassName)}
          />
      ) : null}

      <video
        {...videoProps}
        ref={videoRef}
        src={videoSrc}
        className={cn(
          "absolute inset-0 h-full w-full transition-opacity duration-200",
          isHovered ? "opacity-100" : "opacity-0",
          videoClassName
        )}
      />
    </div>
  );
}
