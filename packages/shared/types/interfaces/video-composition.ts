/**
 * Video Composition Types
 *
 * Shared types for video composition operations across services
 */

export type LogoPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface VideoCompositionSettings {
  roomVideos: Array<{
    url: string;
    roomName: string;
    order: number;
  }>;
  logo?: {
    s3Url: string; // Server version uses S3 URL
    position: LogoPosition;
  };
  subtitles?: {
    enabled: boolean;
    text: string;
    font: string;
  };
  transitions: boolean;
  outputFormat: {
    aspectRatio: "16:9" | "9:16" | "1:1";
  };
}

export interface ComposedVideoResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  fileSize: number;
}

export interface SubtitleData {
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
}
