# ZenCourt Video Processing Server

Express server for FFmpeg-based video processing, designed to run on Hetzner Cloud with Backblaze B2 storage.

## Overview

This server handles video generation and composition for the ZenCourt platform. It receives video processing requests from the Vercel Next.js frontend, processes them using FFmpeg, stores results in Backblaze B2 object storage, and sends webhook notifications when complete.

## Architecture

- **Runtime**: Node.js 20+
- **Framework**: Express 4.x with TypeScript
- **Video Generation**: fal.ai API (webhook-based)
- **Storage**: Backblaze B2 via the object storage SDK v3
- **Video Processing**: FFmpeg (static binaries)
- **Logging**: Pino (structured JSON logs)
- **Deployment**: Docker container on Hetzner Cloud (or local Docker)

## Project Structure

```
video-server/
├── src/
│   ├── server.ts              # Express app initialization & graceful shutdown
│   ├── config/
│   │   ├── env.ts             # Environment configuration with validation
│   │   ├── storage.ts         # Backblaze B2 configuration
│   │   └── logger.ts          # Pino logger setup
│   ├── services/
│   │   ├── storageService.ts  # Backblaze storage client
│   │   ├── videoCompositionService.ts  # FFmpeg video composition
│   │   ├── webhookService.ts  # Webhook delivery with retries
│   │   ├── roomVideoService.ts # fal.ai video generation orchestration
│   │   └── db/                # Database repositories
│   │       ├── videoRepository.ts
│   │       └── videoJobRepository.ts
│   ├── routes/
│   │   ├── health.ts          # Health check endpoint
│   │   ├── video.ts           # Video generation endpoints
│   │   ├── webhooks.ts        # fal.ai webhook handler
│   │   └── storage.ts         # Storage proxy endpoints
│   ├── middleware/
│   │   ├── auth.ts            # API key authentication
│   │   └── errorHandler.ts    # Global error handler with classification
│   └── types/
│       ├── requests.ts        # API request/response types
│       └── jobs.ts            # Video job types
├── Dockerfile                 # Multi-stage Docker build
├── docker-compose.yml         # Local development environment
├── .dockerignore              # Docker build exclusions
├── package.json
└── tsconfig.json
```

## Environment Variables

See `.env.example` for all required and optional environment variables.

### Required Variables

- `B2_ENDPOINT` - Backblaze endpoint (e.g., https://s3.us-west-002.backblazeb2.com)
- `B2_KEY_ID` - Backblaze application key ID
- `B2_APPLICATION_KEY` - Backblaze application key secret
- `B2_BUCKET_NAME` - Backblaze bucket for media storage
- `VIDEO_SERVER_URL` - Public URL for this service (used for redirects + default fal.ai webhook)
- `DATABASE_URL` - PostgreSQL database connection string
- `VERCEL_API_URL` - Vercel API URL for webhook callbacks
- `VERCEL_WEBHOOK_SIGNING_KEY` - HMAC secret shared with Vercel webhooks
- `VIDEO_SERVER_API_KEY` - API key for Vercel <-> video-server authentication
- `FAL_KEY` - fal.ai API key for video generation

### Optional Variables

- `B2_REGION` - Backblaze region (default: `us-west-002`)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (debug/info/warn/error, default: info)
- `MAX_CONCURRENT_JOBS` - Concurrent video processing jobs (default: 1)
- `JOB_TIMEOUT_MS` - Job timeout in milliseconds (default: 600000 = 10 min)
- `TEMP_DIR` - Temporary directory for video processing (default: /tmp/video-processing)
- `WEBHOOK_RETRY_ATTEMPTS` - Number of webhook retry attempts (default: 5)
- `WEBHOOK_RETRY_BACKOFF_MS` - Base backoff delay for webhook retries (default: 1000ms)
- `FAL_WEBHOOK_URL` - Override fal.ai webhook target (defaults to `${VIDEO_SERVER_URL}/webhooks/fal`)

### Backblaze B2 Configuration

Create an application key with read/write permissions for your media bucket, then add:

- `B2_KEY_ID`
- `B2_APPLICATION_KEY`
- `B2_BUCKET_NAME`
- `B2_ENDPOINT`
- `B2_REGION` (optional if using `us-west-002`)

All uploads use the object storage SDK v3 pointed at the Backblaze endpoint—no additional cloud services are required.
Reference `.env.hetzner.example` for a production-ready template that matches the Hetzner deployment.

### fal.ai webhook routing

- **Production** – Point `FAL_WEBHOOK_URL` to the public hostname that fronts this service (typically your ALB DNS name plus `/webhooks/fal`). This is the URL fal.ai calls when a job completes.
- **Local development** – Keep `VIDEO_SERVER_URL=http://localhost:3001` for internal requests, but set `FAL_WEBHOOK_URL` to a public tunnel that forwards to `http://localhost:3001/webhooks/fal` (ngrok, Cloudflare Tunnel, etc.). Without that tunnel fal.ai cannot reach your laptop.
- **Docker Compose** – Export `FAL_WEBHOOK_URL` before running `docker compose` to override the default `http://host.docker.internal:3001/webhooks/fal`.

### Local tunnel helper

The script `apps/video-server/scripts/start-dev-server.sh` automates spinning up an ngrok tunnel and launching Docker Compose with the correct `FAL_WEBHOOK_URL`. Requirements:

- `ngrok` CLI installed and authenticated (`ngrok config add-authtoken ...`)
- `curl` and `python3` available locally

Quick setup:

1. Install the CLI (`brew install ngrok` or download from https://ngrok.com/download).
2. Sign in at https://dashboard.ngrok.com/ to copy your authtoken.
3. Run `ngrok config add-authtoken <token>` once.

Usage:

```bash
# from the repo root
apps/video-server/scripts/start-dev-server.sh up --build
```

The script:

1. Starts `ngrok http 3001` and waits for the HTTPS public URL.
2. Sets `FAL_WEBHOOK_URL=<public-url>/webhooks/fal`.
3. Runs `docker compose -f apps/video-server/docker-compose.yml ...` with your supplied arguments.

Stop the compose stack (Ctrl+C) to tear everything down; the script cleans up the ngrok process automatically.

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

3. Start the local development environment from the repo root (storage traffic goes to your Backblaze bucket):

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

1. Ensure `.env.local` in the repo root sets `VIDEO_SERVER_URL=http://localhost:3001` and that `VIDEO_SERVER_API_KEY` matches the value consumed by the Docker services.
2. Boot the video server. The server writes directly to your Backblaze bucket using the credentials from `.env.local`:

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

This starts the video-server (port 3001).

### Using Docker (Production)

1. Build the image (from the repo root):

```bash
docker build -f apps/video-server/Dockerfile -t zencourt-video-server:latest .
```

2. Run the container with the required environment variables:

```bash
docker run --rm -p 3001:3001 \
  -e B2_ENDPOINT=https://s3.us-west-002.backblazeb2.com \
  -e B2_REGION=us-west-002 \
  -e B2_KEY_ID=your-key-id \
  -e B2_APPLICATION_KEY=your-application-key \
  -e B2_BUCKET_NAME=your-bucket \
  -e VIDEO_SERVER_URL=https://video.example.com \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e VIDEO_SERVER_API_KEY=your-secret-key \
  -e VERCEL_WEBHOOK_SIGNING_KEY=your-webhook-secret \
  -e VERCEL_API_URL=https://your-app.vercel.app \
  -e FAL_KEY=your-fal-api-key \
  -e FAL_WEBHOOK_URL=https://your-domain.com/webhooks/fal \
  zencourt-video-server:latest
```

You can also store those values in an env file (e.g. `apps/video-server/.env.docker`) and pass `--env-file apps/video-server/.env.docker` to keep secrets out of the command history.

### Hetzner Deployment (Manual)

1. Build and push the image to GHCR (or another registry).
2. SSH into your Hetzner server and pull the latest tag.
3. Stop the old container and restart with `/home/deploy/.env.video-server` mounted (see plan in root README for details).

You can also run `scripts/deploy-hetzner.sh` directly on the server. Provide `GHCR_TOKEN` (a PAT or deploy token) and optionally override `CONTAINER_NAME`, `ENV_FILE`, or `DATA_DIR` to match your setup.

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
    "storage": true
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

Upload a file to Backblaze B2 (proxied from Vercel through the video server).

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
  "url": "https://s3.us-west-002.backblazeb2.com/zencourt-media/uploads/file.jpg",
  "signedUrl": "https://s3.us-west-002.backblazeb2.com/zencourt-media/uploads/file.jpg?...",
  "key": "uploads/1234-abc/file.jpg",
  "size": 102400,
  "contentType": "image/jpeg"
}
```

### DELETE /storage/delete

Delete a file from Backblaze B2.

**Headers:**

- `X-API-Key`: Required authentication key
- `Content-Type`: application/json

**Request:**

```json
{
  "url": "https://s3.us-west-002.backblazeb2.com/zencourt-media/uploads/file.jpg"
}
```

**Response:**

```json
{
  "success": true
}
```

### POST /storage/signed-url

Generate a pre-signed URL for an object in Backblaze B2.

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
  "signedUrl": "https://s3.us-west-002.backblazeb2.com/zencourt-media/uploads/file.jpg?...",
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

- **Storage Errors**: STORAGE_UPLOAD_FAILED, STORAGE_DOWNLOAD_FAILED, STORAGE_DELETE_FAILED (Backblaze B2)
- **FFmpeg Errors**: FFMPEG_NOT_FOUND, FFMPEG_PROCESS_FAILED, FFMPEG_TIMEOUT
- **fal.ai Errors**: FAL_SUBMISSION_FAILED, FAL_GENERATION_FAILED
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

### Backblaze access denied

- Verify `B2_KEY_ID`/`B2_APPLICATION_KEY` pair has read/write access to the configured bucket.
- Confirm the bucket exists inside the account and matches `B2_BUCKET_NAME`.
- Double-check `B2_ENDPOINT` and `B2_REGION` match the bucket's region.

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
