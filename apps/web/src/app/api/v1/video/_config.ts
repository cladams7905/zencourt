/**
 * Video server configuration helpers shared between video API routes.
 */

interface VideoServerConfig {
  baseUrl: string;
  apiKey: string;
  webhookSecret?: string;
}

interface ConfigOptions {
  requireWebhookSecret?: boolean;
}

export function getVideoServerConfig(
  options: { requireWebhookSecret: true }
): VideoServerConfig & { webhookSecret: string };
export function getVideoServerConfig(
  options?: ConfigOptions
): VideoServerConfig;
export function getVideoServerConfig(
  options: ConfigOptions = {}
): VideoServerConfig {
  const baseUrl = process.env.VIDEO_SERVER_URL;
  const apiKey = process.env.VIDEO_SERVER_API_KEY;
  const webhookSecret = process.env.VIDEO_WEBHOOK_SECRET;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "VIDEO_SERVER_URL and VIDEO_SERVER_API_KEY must be configured"
    );
  }

  if (options.requireWebhookSecret && !webhookSecret) {
    throw new Error("VIDEO_WEBHOOK_SECRET must be configured");
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
    webhookSecret: options.requireWebhookSecret
      ? (webhookSecret as string)
      : webhookSecret
  };
}
