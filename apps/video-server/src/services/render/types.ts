import type {
  RenderJobData,
  RenderJobState
} from "../remotionRenderQueue";

export type { RenderJobData, RenderJobState };

export type RenderCreateRequest = RenderJobData;

export type RenderCreateResult = {
  jobId: string;
};
