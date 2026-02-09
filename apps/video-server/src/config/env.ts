import { config } from "dotenv";

// C: This adds typing to our process.env
declare global {
  namespace NodeJS {
    export interface ProcessEnv {
      // Server
      NODE_ENV: string;
      PORT: number;
      LOG_LEVEL: string;

      // Database
      DATABASE_URL: string;

      // Storage (Backblaze B2)
      B2_ENDPOINT: string;
      B2_REGION: string;
      B2_KEY_ID: string;
      B2_APPLICATION_KEY: string;
      B2_BUCKET_NAME: string;

      // Server URLs
      VIDEO_SERVER_URL: string;

      // Vercel Webhook
      VERCEL_API_URL: string;
      VERCEL_WEBHOOK_SECRET: string;
      WEBHOOK_RETRY_ATTEMPTS: number;
      WEBHOOK_RETRY_BACKOFF_MS: number;

      // Processing
      MAX_CONCURRENT_JOBS: number;
      JOB_TIMEOUT_MS: number;
      TEMP_DIR: string;
      STORAGE_HEALTH_CACHE_MS: number;
      RENDER_CONCURRENCY?: number;
      GENERATION_CONCURRENCY?: number;

      // API Authentication
      VIDEO_SERVER_API_KEY: string;

      // fal.ai
      FAL_KEY: string;
      FAL_WEBHOOK_URL: string;

      // Runway
      RUNWAY_API_KEY: string;
      RUNWAY_API_URL?: string;
      RUNWAY_API_VERSION?: string;

    }
  }
}

//C: This is all that is needed
export default function Initialize() {
  config();
  const requiredVars = [
    "B2_ENDPOINT",
    "B2_KEY_ID",
    "B2_APPLICATION_KEY",
    "B2_BUCKET_NAME",
    "VIDEO_SERVER_URL",
    "VERCEL_API_URL",
    "VERCEL_WEBHOOK_SECRET",
    "DATABASE_URL",
    "FAL_KEY",
    "RUNWAY_API_KEY"
  ];

  const missingVars: string[] = [];
  for (const varName of requiredVars) {
    if (!process.env[varName] || process.env[varName]?.length === 0) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    console.error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
    process.exit(1);
  }

  if (process.env.VIDEO_SERVER_URL) {
    process.env.VIDEO_SERVER_URL = process.env.VIDEO_SERVER_URL.replace(
      /\/+$/,
      ""
    );
  }

  if (!process.env.FAL_WEBHOOK_URL && process.env.VIDEO_SERVER_URL) {
    process.env.FAL_WEBHOOK_URL = `${process.env.VIDEO_SERVER_URL}/webhooks/fal`;
  }

  if (process.env.FAL_WEBHOOK_URL) {
    process.env.FAL_WEBHOOK_URL = process.env.FAL_WEBHOOK_URL.replace(
      /\/+$/,
      ""
    );
  }
}
