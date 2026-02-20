import type { VideoJobWebhookPayload } from "@shared/types/api";

export type OutboundWebhookRequest = {
  url: string;
  secret: string;
  payload: VideoJobWebhookPayload;
  maxRetries?: number;
  backoffMs?: number;
};
