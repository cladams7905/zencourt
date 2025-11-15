/**
 * Queue Types
 *
 * Type definitions for queuing video jobs and webhook delivery
 */

import { WebhookPayload } from "../api";

export interface WebhookDeliveryOptions {
  url: string;
  secret: string;
  payload: WebhookPayload;
  maxRetries?: number;
  backoffMs?: number;
}

export type QueueErrorCode =
  | "JOB_TIMEOUT"
  | "JOB_PROCESSING_ERROR"
  | "WEBHOOK_DELIVERY_ERROR"
  | "UNKNOWN_ERROR";

export class QueueError extends Error {
  constructor(
    message: string,
    public code: QueueErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = "QueueError";
  }
}
