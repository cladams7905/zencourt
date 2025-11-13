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
│   ├── server.ts              # Express app initialization & graceful shutdown
│   ├── config/
│   │   ├── env.ts             # Environment configuration with validation
│   │   ├── aws.ts             # AWS SDK configuration
│   │   ├── redis.ts           # Redis configuration
│   │   └── logger.ts          # Pino logger setup
│   ├── services/
│   │   ├── s3Service.ts       # S3 upload/download/delete
│   │   ├── videoCompositionService.ts  # FFmpeg video composition
│   │   └── webhookService.ts  # Webhook delivery with retries
│   ├── queues/
│   │   └── videoQueue.ts      # Bull queue for job processing
│   ├── routes/
│   │   ├── health.ts          # Health check endpoint
│   │   ├── video.ts           # Video processing endpoints
│   │   └── storage.ts         # S3 storage proxy endpoints
│   ├── middleware/
│   │   ├── auth.ts            # API key authentication
│   │   └── errorHandler.ts    # Global error handler with classification
│   └── types/
│       ├── requests.ts        # API request/response types
│       └── jobs.ts            # Video job types
├── Dockerfile                 # Multi-stage Docker build
├── docker-compose.yml         # Local development environment
├── .dockerignore              # Docker build exclusions
├── .env.example               # Environment variable template
├── package.json
└── tsconfig.json
```

## Environment Variables

See `.env.example` for all required and optional environment variables.

### Required Variables

- `AWS_REGION` - AWS region (e.g., us-east-1)
- `AWS_S3_BUCKET` - S3 bucket name for media storage
- `REDIS_HOST` - Redis hostname for Bull queue
- `REDIS_PORT` - Redis port (default: 6379)
- `VERCEL_API_URL` - Vercel API URL for webhook callbacks
- `VERCEL_TO_AWS_API_KEY` - API key for Vercel <-> video-server authentication

### Optional Variables

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (debug/info/warn/error, default: info)
- `MAX_CONCURRENT_JOBS` - Concurrent video processing jobs (default: 1)
- `JOB_TIMEOUT_MS` - Job timeout in milliseconds (default: 600000 = 10 min)
- `TEMP_DIR` - Temporary directory for video processing (default: /tmp/video-processing)
- `WEBHOOK_RETRY_ATTEMPTS` - Number of webhook retry attempts (default: 5)
- `WEBHOOK_RETRY_BACKOFF_MS` - Base backoff delay for webhook retries (default: 1000ms)

### AWS Configuration

For development against the real S3 bucket (recommended):

- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - IAM user or role credentials with access to the dev bucket
- `AWS_REGION` - Region for the dev bucket
- `AWS_S3_BUCKET` - Dev bucket name

Optional overrides if you ever point the server at a mock such as LocalStack:

- `AWS_ENDPOINT`
- `AWS_FORCE_PATH_STYLE`

Note: The bucket policy enforces AES256 server-side encryption; the video server automatically sets `ServerSideEncryption=AES256` on uploads, so make sure any ad‑hoc scripts do the same.

## Development

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for local services)

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

3. Start the local development environment from the repo root (Redis + video-server; S3 traffic goes to your dev bucket):

```bash
docker compose -f apps/video-server/docker-compose.yml down
docker compose -f apps/video-server/docker-compose.yml build video-server
docker compose -f apps/video-server/docker-compose.yml up -d
```

4. Run development server:

```bash
npm run dev
```

The server will start on `http://localhost:3001` with hot reload enabled.

### Local-only development workflow

Because the dev Terraform stack no longer provisions ECS/ALB resources, every developer should run the video server locally:

1. Ensure `.env.local` in the repo root sets `AWS_VIDEO_SERVER_URL=http://localhost:3001` and that `VERCEL_TO_AWS_API_KEY` matches the value consumed by the Docker services.
2. Boot the stack (video server + Redis). The server writes directly to your dev S3 bucket using the credentials from `.env.local`:

   ```bash
   docker compose -f apps/video-server/docker-compose.yml up --build
   ```

3. Wait for `zencourt-video-server` logs to show it is listening, then verify with:

   ```bash
   curl http://localhost:3001/health
   ```

4. Start the Next.js app (`pnpm dev --filter @zencourt/web`, etc.); `/api/v1/video/*` routes will hit the local server automatically.

When you are done developing, stop the containers with `Ctrl+C` or `docker compose -f apps/video-server/docker-compose.yml down`.

### Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

Output will be in the `dist/` directory.

### Type Checking

Run TypeScript type checking:

```bash
npm run type-check
```

### Linting

Run ESLint on source files:

```bash
npm run lint
```

### Testing

Run tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

## Production Deployment

### Using Docker Compose (Local Testing)

```bash
# from the repo root
docker compose -f apps/video-server/docker-compose.yml up --build
```

This starts:

- video-server (port 3001)
- Redis (port 6379)
- LocalStack S3 (port 4566)

### Using Docker (Production)

1. Build the image (from the repo root):

```bash
docker build -f apps/video-server/Dockerfile -t zencourt-video-server:latest .
```

2. Run the container with the required environment variables:

```bash
docker run --rm -p 3001:3001 \
  -e AWS_REGION=us-east-1 \
  -e AWS_S3_BUCKET=your-bucket \
  -e AWS_ACCESS_KEY_ID=your-access-key \
  -e AWS_SECRET_ACCESS_KEY=your-secret \
  -e REDIS_HOST=your-redis-host \
  -e VERCEL_TO_AWS_API_KEY=your-secret-key \
  -e REDIS_PORT=6379 \
  -e VERCEL_API_URL=https://your-app.vercel.app \
  zencourt-video-server:latest
```

You can also store those values in an env file (e.g. `apps/video-server/.env.docker`) and pass `--env-file apps/video-server/.env.docker` to keep secrets out of the command history.

### AWS ECS Deployment

1. Push image to ECR:

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag zencourt-video-server:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/zencourt-video-server:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/zencourt-video-server:latest
```

2. Create ECS task definition (see `terraform/` directory for infrastructure as code)

3. Deploy to ECS Fargate

## API Endpoints

### GET /

Returns server information and status.

**Response:**

```json
{
  "service": "ZenCourt Video Processor",
  "version": "1.0.0",
  "status": "running",
  "timestamp": "2025-01-08T12:00:00.000Z"
}
```

### GET /health

Health check endpoint for container orchestration.

**Response (healthy):**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-08T12:00:00.000Z",
  "checks": {
    "ffmpeg": true,
    "s3": true,
    "redis": true
  },
  "queueStats": {
    "waiting": 0,
    "active": 1,
    "completed": 42,
    "failed": 0
  }
}
```

### POST /video/compose

Submit a video processing job.

**Headers:**

- `X-API-Key`: Required authentication key

**Request:**

```json
{
  "jobId": "job_abc123",
  "projectId": "proj_456",
  "userId": "user_789",
  "roomVideoUrls": [
    { "roomId": "room_1", "url": "https://s3.../video1.mp4" },
    { "roomId": "room_2", "url": "https://s3.../video2.mp4" }
  ],
  "compositionSettings": {
    "roomOrder": ["room_1", "room_2"],
    "musicUrl": "https://s3.../music.mp3",
    "musicVolume": 0.5,
    "transitions": {
      "type": "fade",
      "duration": 1
    }
  },
  "webhookUrl": "https://your-app.com/api/v1/webhooks/video",
  "webhookSecret": "your-webhook-secret"
}
```

**Response (202 Accepted):**

```json
{
  "success": true,
  "jobId": "job_abc123",
  "estimatedDuration": 180,
  "queuePosition": 1
}
```

### GET /video/status/:jobId

Get status of a video processing job.

**Headers:**

- `X-API-Key`: Required authentication key

**Response:**

```json
{
  "success": true,
  "jobId": "job_abc123",
  "status": "processing",
  "progress": 45,
  "estimatedTimeRemaining": 90
}
```

### POST /storage/upload

Upload a file to S3 (proxied from Vercel).

**Headers:**

- `X-API-Key`: Required authentication key

**Form Data:**

- `file`: File to upload
- `folder`: Target folder (optional, default: "uploads")
- `userId`: User ID for organized storage (optional)
- `projectId`: Project ID for organized storage (optional)

**Response:**

```json
{
  "success": true,
  "url": "https://bucket.s3.region.amazonaws.com/uploads/file.jpg",
  "signedUrl": "https://bucket.s3.region.amazonaws.com/uploads/file.jpg?...",
  "key": "uploads/1234-abc/file.jpg",
  "size": 102400,
  "contentType": "image/jpeg"
}
```

### DELETE /storage/delete

Delete a file from S3.

**Headers:**

- `X-API-Key`: Required authentication key
- `Content-Type`: application/json

**Request:**

```json
{
  "url": "https://bucket.s3.region.amazonaws.com/uploads/file.jpg"
}
```

**Response:**

```json
{
  "success": true
}
```

### POST /storage/signed-url

Generate a pre-signed URL for an S3 object.

**Headers:**

- `X-API-Key`: Required authentication key
- `Content-Type`: application/json

**Request:**

```json
{
  "key": "uploads/file.jpg",
  "expiresIn": 3600
}
```

**Response:**

```json
{
  "success": true,
  "signedUrl": "https://bucket.s3.region.amazonaws.com/uploads/file.jpg?...",
  "expiresIn": 3600
}
```

## Webhooks

When video processing completes, the server sends a webhook to the configured `webhookUrl`:

**Headers:**

- `Content-Type`: application/json
- `X-Webhook-Signature`: HMAC-SHA256 signature of payload
- `X-Webhook-Delivery-Attempt`: Delivery attempt number (1-5)
- `X-Webhook-Timestamp`: ISO 8601 timestamp
- `User-Agent`: ZenCourt-Video-Server/1.0

**Payload (Success):**

```json
{
  "jobId": "job_abc123",
  "projectId": "proj_456",
  "userId": "user_789",
  "status": "completed",
  "timestamp": "2025-01-08T12:00:00.000Z",
  "result": {
    "videoUrl": "https://s3.../final-video.mp4",
    "thumbnailUrl": "https://s3.../thumbnail.jpg",
    "duration": 120,
    "resolution": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

**Payload (Failure):**

```json
{
  "jobId": "job_abc123",
  "projectId": "proj_456",
  "userId": "user_789",
  "status": "failed",
  "timestamp": "2025-01-08T12:00:00.000Z",
  "error": {
    "message": "FFmpeg processing failed",
    "type": "FFMPEG_PROCESS_FAILED",
    "retryable": true
  }
}
```

## Error Handling

The server uses structured error handling with classification:

### Error Types

- **S3 Errors**: S3_UPLOAD_FAILED, S3_DOWNLOAD_FAILED, S3_DELETE_FAILED
- **FFmpeg Errors**: FFMPEG_NOT_FOUND, FFMPEG_PROCESS_FAILED, FFMPEG_TIMEOUT
- **Queue Errors**: QUEUE_FULL, JOB_TIMEOUT, REDIS_CONNECTION_ERROR
- **Webhook Errors**: WEBHOOK_DELIVERY_FAILED
- **Validation Errors**: INVALID_INPUT, MISSING_REQUIRED_FIELD
- **Auth Errors**: UNAUTHORIZED, INVALID_API_KEY

### Error Response Format

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": {
    "field": "additionalInfo"
  },
  "retryable": true
}
```

## Troubleshooting

### FFmpeg not found

Ensure FFmpeg binaries are installed. In Docker, this is handled automatically. For local development:

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
apt-get install ffmpeg
```

### Redis connection failed

Check Redis is running:

```bash
docker ps | grep redis
# or
redis-cli ping
```

### S3 access denied

Verify AWS credentials and S3 bucket permissions. For LocalStack:

```bash
aws --endpoint-url=http://localhost:4566 s3 mb s3://zencourt-media-dev
```

### Webhook delivery failures

- Check webhook URL is accessible from the server
- Verify webhook secret matches on both sides
- Check webhook endpoint returns 200 OK

### High memory usage

- Reduce `MAX_CONCURRENT_JOBS` to 1
- Ensure temp files are being cleaned up
- Monitor Docker container limits

## License

MIT
