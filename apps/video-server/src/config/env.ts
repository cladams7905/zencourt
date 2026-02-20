import { config } from "dotenv";

declare global {
  namespace NodeJS {
    export interface ProcessEnv {
      // Server
      NODE_ENV?: string;
      PORT?: string;
      LOG_LEVEL?: string;

      // Database
      DATABASE_URL?: string;

      // Storage (Backblaze B2)
      B2_ENDPOINT?: string;
      B2_REGION?: string;
      B2_KEY_ID?: string;
      B2_APPLICATION_KEY?: string;
      B2_BUCKET_NAME?: string;
      STORAGE_PUBLIC_BASE_URL?: string;

      // Server URLs
      VIDEO_SERVER_URL?: string;

      // Vercel Webhook
      VERCEL_API_URL?: string;
      VERCEL_WEBHOOK_SECRET?: string;
      WEBHOOK_TIMEOUT_MS?: string;

      // Processing
      TEMP_DIR?: string;
      STORAGE_HEALTH_CACHE_MS?: string;
      RENDER_CONCURRENCY?: string;
      GENERATION_CONCURRENCY?: string;
      REMOTION_CACHE_DIR?: string;

      // API Authentication
      VIDEO_SERVER_API_KEY?: string;

      // fal.ai
      FAL_KEY?: string;
      FAL_WEBHOOK_URL?: string;

      // Runway
      RUNWAY_API_KEY?: string;
      RUNWAY_API_URL?: string;
      RUNWAY_API_VERSION?: string;
    }
  }
}

export interface ParsedEnv {
  nodeEnv: string;
  port: number;
  logLevel: string;
  videoServerUrl: string;
  falWebhookUrl: string;
}

const REQUIRED_ENV_VARS = [
  "B2_ENDPOINT",
  "B2_KEY_ID",
  "B2_APPLICATION_KEY",
  "B2_BUCKET_NAME",
  "VIDEO_SERVER_URL",
  "VERCEL_API_URL",
  "VERCEL_WEBHOOK_SECRET",
  "DATABASE_URL",
  "FAL_KEY",
  "RUNWAY_API_KEY",
  "VIDEO_SERVER_API_KEY"
] as const;

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function parsePositiveInt(
  value: string | undefined,
  name: string,
  fallback: number
): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

export function parseEnv(rawEnv: NodeJS.ProcessEnv): ParsedEnv {
  const missingVars: string[] = REQUIRED_ENV_VARS.filter(
    (varName) => !rawEnv[varName] || rawEnv[varName]?.length === 0
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }

  const videoServerUrl = trimTrailingSlashes(rawEnv.VIDEO_SERVER_URL as string);
  const falWebhookUrl = trimTrailingSlashes(
    rawEnv.FAL_WEBHOOK_URL || `${videoServerUrl}/webhooks/fal`
  );

  return {
    nodeEnv: rawEnv.NODE_ENV || "development",
    port: parsePositiveInt(rawEnv.PORT, "PORT", 3001),
    logLevel: rawEnv.LOG_LEVEL || "info",
    videoServerUrl,
    falWebhookUrl
  };
}

export function initializeEnv(
  rawEnv: NodeJS.ProcessEnv = process.env,
  opts: { exitOnError?: boolean } = {}
): ParsedEnv {
  const exitOnError = opts.exitOnError ?? true;
  config();
  try {
    const parsed = parseEnv(rawEnv);
    rawEnv.NODE_ENV = parsed.nodeEnv;
    rawEnv.PORT = String(parsed.port);
    rawEnv.LOG_LEVEL = parsed.logLevel;
    rawEnv.VIDEO_SERVER_URL = parsed.videoServerUrl;
    rawEnv.FAL_WEBHOOK_URL = parsed.falWebhookUrl;
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (exitOnError) {
      console.error(message);
      process.exit(1);
    }
    throw error;
  }
}

export default function Initialize() {
  return initializeEnv(process.env);
}
