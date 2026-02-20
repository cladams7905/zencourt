import type { RenderJobData } from "./types";

export type RenderOutput = {
  videoBuffer: Buffer;
  thumbnailBuffer: Buffer;
  durationSeconds: number;
  fileSize: number;
};

export type RenderExecutionInput = {
  clips: RenderJobData["clips"];
  orientation: RenderJobData["orientation"];
  transitionDurationSeconds?: number;
  videoId: string;
  onProgress?: (progress: number) => void;
  cancelSignal?: unknown;
};

export interface RenderProvider {
  renderListingVideo(options: RenderExecutionInput): Promise<RenderOutput>;
}

export interface RenderProviderStrategy<TResult = unknown> {
  readonly name: string;
  render(data: RenderJobData): Promise<TResult>;
}

export interface RenderProviderFacade<TResult = unknown> {
  render(data: RenderJobData): Promise<TResult>;
}
