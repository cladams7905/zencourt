import { Request } from "express";
import type { FalWebhookPayload } from "@shared/types/api";

export interface FalWebhookHeaders {
  requestId: string | undefined;
  userId: string | undefined;
  timestamp: string | undefined;
  signature: string | undefined;
}

export interface FalWebhookRequestContext {
  jobId?: string;
  rawBody?: Buffer;
  headers: FalWebhookHeaders;
  payload: FalWebhookPayload;
}

export function extractWebhookJobId(req: Request): string | undefined {
  const rawRequestId = (req.query?.requestId ?? req.query?.request_id) as
    | string
    | string[]
    | undefined;
  return Array.isArray(rawRequestId) ? rawRequestId[0] : rawRequestId;
}

export function parseFalWebhookRequest(req: Request): FalWebhookRequestContext {
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  return {
    jobId: extractWebhookJobId(req),
    rawBody,
    headers: {
      requestId: req.header("x-fal-webhook-request-id"),
      userId: req.header("x-fal-webhook-user-id"),
      timestamp: req.header("x-fal-webhook-timestamp"),
      signature: req.header("x-fal-webhook-signature")
    },
    payload: req.body as FalWebhookPayload
  };
}
