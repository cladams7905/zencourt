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

export function getVideoServerConfig(options: {
  requireWebhookSecret: true;
}): VideoServerConfig & { webhookSecret: string };
export function getVideoServerConfig(
  options?: ConfigOptions
): VideoServerConfig;
export function getVideoServerConfig(
  options: ConfigOptions = {}
): VideoServerConfig {
  const baseUrl = process.env.VIDEO_SERVER_URL?.trim();
  const apiKey = process.env.VIDEO_SERVER_API_KEY?.trim();
  const webhookSecret = process.env.VERCEL_WEBHOOK_SIGNING_KEY?.trim();

  if (!baseUrl || !apiKey) {
    throw new Error(
      "VIDEO_SERVER_URL and VIDEO_SERVER_API_KEY must be configured"
    );
  }

  if (options.requireWebhookSecret && !webhookSecret) {
    throw new Error("VERCEL_WEBHOOK_SIGNING_KEY must be configured");
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
    webhookSecret: options.requireWebhookSecret
      ? (webhookSecret as string)
      : webhookSecret
  };
}
