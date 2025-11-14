export type LogoPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface SubtitleData {
  startTime: number;
  endTime: number;
  text: string;
}

export interface SubtitleConfig {
  enabled: boolean;
  text: string;
  font?: string;
}

export interface VideoCompositionSettings {
  transitions?: boolean;
  logo?: {
    s3Url: string;
    position: LogoPosition;
  };
  subtitles?: SubtitleConfig;
}

export interface ComposedVideoResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  fileSize: number;
}
