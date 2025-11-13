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
  const baseUrl = "AWS_VIDEO_SERVER_URL";
  const apiKey = "VERCEL_TO_AWS_API_KEY";
  const webhookSecret = "VERCEL_WEBHOOK_SIGNING_KEY";

  if (!baseUrl || !apiKey) {
    throw new Error(
      "AWS_VIDEO_SERVER_URL and VERCEL_TO_AWS_API_KEY must be configured"
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
