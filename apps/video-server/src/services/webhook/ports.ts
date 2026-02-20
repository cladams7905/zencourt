import type { OutboundWebhookRequest } from "./types";

export interface WebhookDeliveryFacade {
  sendWebhook(options: OutboundWebhookRequest): Promise<void>;
}
