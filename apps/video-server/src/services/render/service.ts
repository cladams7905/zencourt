import { remotionRenderQueue } from "../remotionRenderQueue";
import { remotionRenderService } from "../remotionRenderService";
import type { RenderJobData } from "./types";

export type RenderQueueFacade = {
  getJob: (jobId: string) => ReturnType<typeof remotionRenderQueue.getJob>;
  cancelJob: (jobId: string) => boolean;
  createJob: (...args: Parameters<typeof remotionRenderQueue.createJob>) => string;
};

export type RemotionRenderProviderFacade = {
  renderListingVideo: (
    options: Parameters<typeof remotionRenderService.renderListingVideo>[0]
  ) => ReturnType<typeof remotionRenderService.renderListingVideo>;
  renderThumbnailFromVideo: (
    options: Parameters<typeof remotionRenderService.renderThumbnailFromVideo>[0]
  ) => ReturnType<typeof remotionRenderService.renderThumbnailFromVideo>;
};

export const renderServiceFacade: {
  queue: RenderQueueFacade;
  provider: RemotionRenderProviderFacade;
} = {
  queue: remotionRenderQueue,
  provider: remotionRenderService
};

export { remotionRenderQueue, remotionRenderService, RenderJobData };
