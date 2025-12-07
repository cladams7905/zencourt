// Set up test environment variables
process.env.NODE_ENV = "test";
process.env.PORT = "3001";
process.env.B2_ENDPOINT = "https://s3.us-west-002.backblazeb2.com";
process.env.B2_REGION = "us-west-002";
process.env.B2_KEY_ID = "test-key-id";
process.env.B2_APPLICATION_KEY = "test-application-key";
process.env.B2_BUCKET_NAME = "test-bucket";
process.env.VIDEO_SERVER_URL = "http://localhost:3001";
process.env.VERCEL_API_URL = "http://localhost:3000";
process.env.VERCEL_WEBHOOK_SECRET = "test-signing-key";
process.env.VIDEO_SERVER_API_KEY = "test-api-key";
process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/zencourt";
process.env.FAL_KEY = "test-fal-key";
process.env.LOG_LEVEL = "error"; // Suppress logs during tests
