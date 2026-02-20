import { createRenderQueue } from "./queue";
import type { RenderJobData, RenderJobState } from "./types";
import { remotionProvider } from "./providers/remotion";
import type { RenderOutput, RenderProvider } from "./ports";
import type { CancelSignal } from "@remotion/renderer";

export type RenderQueueFacade = {
  getJob: (jobId: string) => RenderJobState | undefined;
  cancelJob: (jobId: string) => boolean;
  createJob: (
    data: RenderJobData,
    handlers?: {
      onStart?: (data: RenderJobData) => Promise<void>;
      onProgress?: (progress: number, data: RenderJobData) => Promise<void>;
      onComplete?: (
        result: RenderOutput,
        data: RenderJobData
      ) => Promise<{ videoUrl?: string; thumbnailUrl?: string }>;
      onError?: (error: Error, data: RenderJobData) => Promise<void>;
    },
    jobIdOverride?: string
  ) => string;
};

export type RenderServiceProviderFacade = {
  renderListingVideo: (options: {
    clips: RenderJobData["clips"];
    orientation: RenderJobData["orientation"];
    transitionDurationSeconds?: number;
    videoId: string;
    onProgress?: (progress: number) => void;
    cancelSignal?: CancelSignal;
  }) => Promise<RenderOutput>;
};

export const renderProvider: RenderProvider = remotionProvider;
const internalRenderQueue = createRenderQueue(renderProvider);
export const renderQueue: RenderQueueFacade = internalRenderQueue;

export const renderServiceFacade: {
  queue: RenderQueueFacade;
  provider: RenderServiceProviderFacade;
} = {
  queue: renderQueue,
  provider: renderProvider
};

export { RenderJobData };
