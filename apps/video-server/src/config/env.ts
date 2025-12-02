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
      DATBASE_URL: string;

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
      VERCEL_WEBHOOK_SIGNING_SECRET: string;
      WEBHOOK_RETRY_ATTEMPTS: number;
      WEBHOOK_RETRY_BACKOFF_MS: number;

      // Processing
      MAX_CONCURRENT_JOBS: number;
      JOB_TIMEOUT_MS: number;
      TEMP_DIR: string;
      STORAGE_HEALTH_CACHE_MS: number;

      // API Authentication
      VIDEO_SERVER_API_KEY: string;

      // fal.ai
      FAL_KEY: string;
      FAL_WEBHOOK_URL: string;
    }
  }
}

//C: This is all that is needed
export default function Initialize() {
  config()
  const requiredVars = [
    "B2_ENDPOINT",
    "B2_KEY_ID",
    "B2_APPLICATION_KEY",
    "B2_BUCKET_NAME",
    "VIDEO_SERVER_URL",
    "VERCEL_API_URL",
    "VERCEL_WEBHOOK_SIGNING_KEY",
    "DATABASE_URL",
    "FAL_KEY"
  ];

  for (var reqVar in requiredVars) {
    if (!process.env[reqVar]) {
      console.error(`Missing environment variable value for ${reqVar}`)
    }
  } 
  process.env.VIDEO_SERVER_URL = process.env.VIDEO_SERVER_URL.replace(/\/+$/, "");
  process.env.FAL_WEBHOOK_URL = (process.env.VIDEO_SERVER_URL ?? `${process.env.VIDEO_SERVER_URL}/webhooks/fal`).trim();
}