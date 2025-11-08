import { config } from 'dotenv';

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
  config();
}

interface EnvConfig {
  // Server
  nodeEnv: string;
  port: number;
  logLevel: string;

  // AWS
  awsRegion: string;
  awsS3Bucket: string;

  // Redis
  redisHost: string;
  redisPort: number;
  redisPassword?: string;

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
}

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getEnvVarOptional(name: string, defaultValue?: string): string | undefined {
  return process.env[name] || defaultValue;
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
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  port: getEnvVarNumber('PORT', 3001),
  logLevel: getEnvVar('LOG_LEVEL', 'info'),

  // AWS
  awsRegion: getEnvVar('AWS_REGION', 'us-east-1'),
  awsS3Bucket: getEnvVar('AWS_S3_BUCKET'),

  // Redis
  redisHost: getEnvVar('REDIS_HOST', 'localhost'),
  redisPort: getEnvVarNumber('REDIS_PORT', 6379),
  redisPassword: getEnvVarOptional('REDIS_PASSWORD'),

  // Vercel Webhook
  vercelApiUrl: getEnvVar('VERCEL_API_URL'),
  webhookRetryAttempts: getEnvVarNumber('WEBHOOK_RETRY_ATTEMPTS', 5),
  webhookRetryBackoffMs: getEnvVarNumber('WEBHOOK_RETRY_BACKOFF_MS', 1000),

  // Processing
  maxConcurrentJobs: getEnvVarNumber('MAX_CONCURRENT_JOBS', 1),
  jobTimeoutMs: getEnvVarNumber('JOB_TIMEOUT_MS', 600000),
  tempDir: getEnvVar('TEMP_DIR', '/tmp/video-processing'),

  // API Authentication
  awsApiKey: getEnvVar('AWS_API_KEY'),
};

export function validateEnv(): void {
  console.log('[Config] Validating environment variables...');

  // List of required variables that must be set
  const requiredVars = [
    'AWS_REGION',
    'AWS_S3_BUCKET',
    'REDIS_HOST',
    'VERCEL_API_URL',
    'AWS_API_KEY',
  ];

  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    console.error('[Config] ❌ Missing required environment variables:');
    missing.forEach((varName) => {
      console.error(`  - ${varName}`);
    });
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log('[Config] ✅ All required environment variables are set');

  // Log loaded configuration (redact secrets)
  console.log('[Config] Loaded configuration:', {
    nodeEnv: env.nodeEnv,
    port: env.port,
    logLevel: env.logLevel,
    awsRegion: env.awsRegion,
    awsS3Bucket: env.awsS3Bucket,
    redisHost: env.redisHost,
    redisPort: env.redisPort,
    redisPassword: env.redisPassword ? '***REDACTED***' : undefined,
    vercelApiUrl: env.vercelApiUrl,
    webhookRetryAttempts: env.webhookRetryAttempts,
    maxConcurrentJobs: env.maxConcurrentJobs,
    jobTimeoutMs: env.jobTimeoutMs,
    tempDir: env.tempDir,
    awsApiKey: '***REDACTED***',
  });
}
