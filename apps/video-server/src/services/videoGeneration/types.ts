import { FalWebhookPayload } from "@/routes/webhooks/domain/requests";
import type {
  VideoJobResult,
  VideoServerGenerateRequest
} from "@shared/types/api";

export type VideoGenerationStartRequest = VideoServerGenerateRequest;

export type VideoGenerationStartResult = {
  jobsStarted: number;
  failedJobs: string[];
};

export type VideoGenerationWebhookInput = {
  payload: FalWebhookPayload;
  fallbackJobId?: string;
};

export type VideoGenerationJobCompletion = {
  jobId: string;
  result: VideoJobResult;
};
