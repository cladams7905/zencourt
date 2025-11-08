# ZenCourt Video Processing Server

Express server for FFmpeg-based video processing, designed to run on AWS ECS Fargate.

## Overview

This server handles video generation and composition for the ZenCourt platform. It receives video processing requests from the Vercel Next.js frontend, processes them using FFmpeg, stores results in AWS S3, and sends webhook notifications when complete.

## Architecture

- **Runtime**: Node.js 20+
- **Framework**: Express 4.x with TypeScript
- **Queue**: Bull (Redis-backed)
- **Storage**: AWS S3 via AWS SDK v3
- **Video Processing**: FFmpeg (static binaries)
- **Logging**: Pino (structured JSON logs)
- **Deployment**: Docker container on AWS ECS Fargate

## Project Structure

```
video-server/
├── src/
│   ├── server.ts              # Express app initialization
│   ├── config/
│   │   ├── env.ts             # Environment configuration
│   │   ├── aws.ts             # AWS SDK configuration
│   │   └── logger.ts          # Pino logger setup
│   ├── services/
│   │   ├── s3Service.ts       # S3 upload/download (Task 6)
│   │   ├── videoCompositionService.ts  # FFmpeg operations (Task 7)
│   │   └── webhookService.ts  # Webhook delivery (Task 11)
│   ├── routes/
│   │   ├── health.ts          # Health check endpoint (Task 10)
│   │   └── video.ts           # Video processing endpoints (Task 9)
│   ├── middleware/
│   │   ├── auth.ts            # API key authentication (Task 9)
│   │   └── errorHandler.ts    # Global error handler (Task 12)
│   └── types/
│       ├── requests.ts        # API request/response types
│       └── jobs.ts            # Video job types
├── Dockerfile                 # Multi-stage Docker build (Task 14)
├── docker-compose.yml         # Local development (Task 16)
├── package.json
└── tsconfig.json
```

## Environment Variables

See `.env.example` for all required and optional environment variables.

### Required Variables

- `AWS_REGION` - AWS region (e.g., us-east-1)
- `AWS_S3_BUCKET` - S3 bucket name for media storage
- `REDIS_HOST` - Redis hostname for Bull queue
- `VERCEL_API_URL` - Vercel API URL for webhook callbacks
- `AWS_API_KEY` - API key for Vercel <-> AWS authentication

### Optional Variables

- `PORT` - Server port (default: 3001)
- `LOG_LEVEL` - Logging level (default: info)
- `REDIS_PORT` - Redis port (default: 6379)
- `MAX_CONCURRENT_JOBS` - Concurrent video processing jobs (default: 1)
- `JOB_TIMEOUT_MS` - Job timeout in milliseconds (default: 600000 = 10 min)

## Development

### Prerequisites

- Node.js 20+
- Redis (for local development)
- AWS credentials (for S3 access)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start Redis (using Docker):
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

4. Run development server:
```bash
npm run dev
```

The server will start on `http://localhost:3001` with hot reload enabled.

### Build

Compile TypeScript to JavaScript:
```bash
npm run build
```

Output will be in the `dist/` directory.

### Type Checking

Run TypeScript type checking without emitting files:
```bash
npm run type-check
```

### Linting

Run ESLint on source files:
```bash
npm run lint
```

## Production

### Using Docker

Build and run the Docker container:
```bash
docker build -t zencourt-video-server .
docker run -p 3001:3001 --env-file .env zencourt-video-server
```

### Using Node.js

1. Build the application:
```bash
npm run build
```

2. Start the server:
```bash
NODE_ENV=production npm start
```

## API Endpoints

### GET /

Returns server information and status.

### GET /health

Health check endpoint. Returns:
- Server health status
- FFmpeg availability
- S3 connectivity
- Redis connectivity
- Queue statistics

### POST /video/process (Coming in Task 9)

Submit a video processing job.

Request:
```json
{
  "jobId": "job_123",
  "projectId": "proj_456",
  "userId": "user_789",
  "roomVideoUrls": ["https://s3.../video1.mp4", "https://s3.../video2.mp4"],
  "compositionSettings": { ... },
  "webhookUrl": "https://your-app.com/api/webhooks/video-complete",
  "webhookSecret": "your-secret"
}
```

Response:
```json
{
  "success": true,
  "jobId": "job_123",
  "estimatedDuration": 180,
  "queuePosition": 1
}
```

### GET /video/status/:jobId (Coming in Task 9)

Get status of a video processing job.

## Implementation Roadmap

### Phase 2: Express Video Processing Server
- [x] Task 5: Initialize Express server project structure
- [ ] Task 6: Implement S3 storage service
- [ ] Task 7: Port video composition service to Express
- [ ] Task 8: Implement job queue with Bull and Redis
- [ ] Task 9: Create video processing endpoints
- [ ] Task 10: Implement health check endpoint
- [ ] Task 11: Build webhook delivery service
- [ ] Task 12: Add error handling and logging middleware
- [ ] Task 13: Implement graceful shutdown handling

## License

MIT
