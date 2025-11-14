import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { logger } from "@/config/logger";

function loadLocalEnvFiles(): void {
  const envFiles: string[] = [];

  const resolveMaybeAbsolute = (filePath: string): string =>
    path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

  if (process.env.ENV_FILE) {
    envFiles.push(resolveMaybeAbsolute(process.env.ENV_FILE));
  }

  const repoRoot = path.resolve(__dirname, "../../../..");
  const searchDirs = [process.cwd(), repoRoot];
  const baseFiles = [".env", ".env.local"];

  for (const base of baseFiles) {
    for (const dir of searchDirs) {
      envFiles.push(path.resolve(dir, base));
    }
  }

  const loaded: string[] = [];
  const seen = new Set<string>();
  for (const filePath of envFiles) {
    if (seen.has(filePath)) {
      continue;
    }
    seen.add(filePath);

    if (fs.existsSync(filePath)) {
      config({ path: filePath, override: true });
      loaded.push(filePath);
    }
  }

  if (loaded.length > 0) {
    logger.info(`[Config] Loaded env files: ${loaded}`);
    return;
  }

  config();
}

// Load environment variables from the repo-level .env/.env.local files in development
if (process.env.NODE_ENV !== "production") {
  loadLocalEnvFiles();
}

interface EnvConfig {
  // Server
  nodeEnv: string;
  port: number;
  logLevel: string;

  // Database
  databaseUrl: string;

  // AWS
  awsRegion: string;
  awsS3Bucket: string;

  // Vercel Webhook
  vercelApiUrl: string;
  webhookRetryAttempts: number;
  webhookRetryBackoffMs: number;

  // Processing
  maxConcurrentJobs: number;
  jobTimeoutMs: number;
  tempDir: string;

  // API Authentication
  awsApiKey: string;

  // fal.ai
  falApiKey: string;
  falWebhookUrl: string;
}

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getEnvVarNumber(name: string, defaultValue?: number): number {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ? parseInt(value, 10) : defaultValue!;
}

export const env: EnvConfig = {
  // Server
  nodeEnv: getEnvVar("NODE_ENV", "development"),
  port: getEnvVarNumber("PORT", 3001),
  logLevel: getEnvVar("LOG_LEVEL", "info"),

  // Database
  databaseUrl: getEnvVar("DATABASE_URL"),

  // AWS
  awsRegion: getEnvVar("AWS_REGION", "us-east-1"),
  awsS3Bucket: getEnvVar("AWS_S3_BUCKET"),

  // Vercel Webhook
  vercelApiUrl: getEnvVar("VERCEL_API_URL"),
  webhookRetryAttempts: getEnvVarNumber("WEBHOOK_RETRY_ATTEMPTS", 5),
  webhookRetryBackoffMs: getEnvVarNumber("WEBHOOK_RETRY_BACKOFF_MS", 1000),

  // Processing
  maxConcurrentJobs: getEnvVarNumber("MAX_CONCURRENT_JOBS", 1),
  jobTimeoutMs: getEnvVarNumber("JOB_TIMEOUT_MS", 600000),
  tempDir: getEnvVar("TEMP_DIR", "/tmp/video-processing"),

  // API Authentication
  awsApiKey: getEnvVar("VERCEL_TO_AWS_API_KEY"),

  // fal.ai
  falApiKey: getEnvVar("FAL_KEY"),
  falWebhookUrl: getEnvVar("FAL_WEBHOOK_URL")
};

export function validateEnv(): void {
  logger.debug("[Config] Validating environment variables...");

  // List of required variables that must be set
  const requiredVars = [
    "AWS_REGION",
    "AWS_S3_BUCKET",
    "VERCEL_API_URL",
    "DATABASE_URL",
    "FAL_KEY",
    "FAL_WEBHOOK_URL"
  ];

  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (!process.env.VERCEL_TO_AWS_API_KEY) {
    missing.push("VERCEL_TO_AWS_API_KEY");
  }

  if (missing.length > 0) {
    console.error("[Config] ❌ Missing required environment variables:");
    missing.forEach((varName) => {
      console.error(`  - ${varName}`);
    });
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  logger.info(
    `[Config] ✅ Loaded configuration: ${{
      nodeEnv: env.nodeEnv,
      port: env.port,
      logLevel: env.logLevel,
      awsRegion: env.awsRegion,
      awsS3Bucket: env.awsS3Bucket,
      vercelApiUrl: env.vercelApiUrl,
      webhookRetryAttempts: env.webhookRetryAttempts,
      maxConcurrentJobs: env.maxConcurrentJobs,
      jobTimeoutMs: env.jobTimeoutMs,
      tempDir: env.tempDir,
      databaseUrl: env.databaseUrl ? "***REDACTED***" : undefined,
      awsApiKey: "***REDACTED***",
      falApiKey: "***REDACTED***",
      falWebhookUrl: env.falWebhookUrl
    }}`
  );
}
