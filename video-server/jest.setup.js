// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_S3_BUCKET = 'test-bucket';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.VERCEL_API_URL = 'http://localhost:3000';
process.env.AWS_API_KEY = 'test-api-key';
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests
