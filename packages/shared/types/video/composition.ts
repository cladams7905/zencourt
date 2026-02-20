export type LogoPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface SubtitleConfig {
  enabled: boolean;
  text: string;
  font?: string;
}
