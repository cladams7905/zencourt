# Zencourt Video Processing Server

Express server for AI-powered video generation and composition, designed to run on Hetzner Cloud with Backblaze B2 storage.

## Overview

This server handles video generation and composition for the Zencourt platform. It receives video processing requests from the Vercel Next.js frontend, generates videos using AI services (Runway ML, Kling/fal.ai), composes them using Remotion, stores results in Backblaze B2 object storage, and sends webhook notifications when complete.

## Architecture

- **Runtime**: Node.js 20+
- **Framework**: Express 4.x with TypeScript
- **AI Video Generation**: Runway ML (gen4_turbo) as primary, Kling/fal.ai as fallback
- **Video Composition**: Remotion (React-based video rendering)
- **Storage**: Backblaze B2 via AWS SDK v3
- **Logging**: Pino (structured JSON logs)
- **Deployment**: Docker container on Hetzner Cloud (or local Docker)

## Get Started

The script `apps/video-server/scripts/start-dev-server.sh` automates spinning up an ngrok tunnel and launching Docker Compose with the correct `FAL_WEBHOOK_URL`. Requirements:

- `ngrok` CLI installed and authenticated (`ngrok config add-authtoken ...`)
- `curl` and `python3` available locally

### Quick setup:

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

## Project Structure

```
video-server/
├── src/
│   ├── server.ts              # Express app initialization & graceful shutdown
│   ├── config/
│   │   ├── env.ts             # Environment configuration with fail-fast validation
│   │   ├── storage.ts         # Backblaze B2 configuration
│   │   └── logger.ts          # Pino logger setup
│   ├── services/
│   │   ├── storageService.ts        # Backblaze storage client
│   │   ├── webhookService.ts        # Webhook delivery with retries
│   │   ├── videoGenerationService.ts # Orchestrates AI video generation workflow
│   │   ├── runwayService.ts         # Runway ML SDK integration (gen4_turbo)
│   │   ├── klingService.ts          # Kling/fal.ai video generation
│   │   ├── remotionRenderService.ts # Remotion video rendering
│   │   └── remotionRenderQueue.ts   # Render job queue management
│   ├── remotion/
│   │   ├── index.tsx          # Remotion root and composition registration
│   │   └── ListingVideo.tsx   # Listing video composition component
│   ├── routes/
│   │   ├── health.ts          # Health check endpoint
│   │   ├── video.ts           # Video generation endpoints
│   │   ├── renders.ts         # Remotion render job endpoints
│   │   ├── webhooks.ts        # fal.ai webhook handler
│   │   └── storage.ts         # Storage proxy endpoints
│   ├── middleware/
│   │   ├── auth.ts            # API key authentication
│   │   └── errorHandler.ts    # Global error handler with classification
│   └── utils/
│       ├── cache.ts           # TTL cache with automatic expiration
│       ├── compositionHelpers.ts # Video composition utilities
│       ├── dbHelpers.ts       # Centralized database operations
│       └── downloadWithRetry.ts # Download utilities with retry logic
├── Dockerfile                 # Multi-stage Docker build
├── docker-compose.yml         # Local development environment
├── .dockerignore              # Docker build exclusions
├── package.json
└── tsconfig.json
```

## Key Services

### Video Generation Service (`videoGenerationService.ts`)

Orchestrates the entire video generation workflow:

- Receives job requests from the Next.js web app
- Dispatches to Runway ML (primary) or Kling/fal.ai (fallback)
- Handles webhook callbacks from AI services
- Downloads and normalizes generated videos
- Triggers Remotion composition when all jobs complete **only if** `ENABLE_FINAL_COMPOSITION=true`
- Sends completion webhooks to the web app

**Clip-first workflow note:** the parent `video_gen_batch` record is treated as a run/batch only. Final asset URLs live on the `content` row when a user saves a draft/favorite. Individual clip URLs and thumbnails are stored on `video_gen_jobs`.

### Runway Service (`runwayService.ts`)

Integrates with Runway ML's gen4_turbo model:

- Image-to-video generation
- Supports various aspect ratios: `1280:720`, `720:1280`, `1104:832`, `832:1104`, `960:960`, `1584:672`
- Built-in task polling via SDK's `waitForTaskOutput()`

### Remotion Render Service (`remotionRenderService.ts`)

Handles video composition using Remotion:

- Combines individual room videos into final listing video
- Supports vertical (720x1280) and landscape (1280x720) orientations
- Generates thumbnails from video frames
- Progress tracking and cancellation support

### Database Helpers (`utils/dbHelpers.ts`)

Centralized database operations:

- Render job CRUD: `createRenderJobRecord`, `markRenderJobProcessing`, `updateRenderJobProgress`, `markRenderJobCompleted`, `markRenderJobFailed`
- Cancel operations: `cancelVideosByListing`, `cancelVideosByIds`, `cancelJobsByListingId`

### TTL Cache (`utils/cache.ts`)

Memory-safe caching with automatic expiration:

- Configurable max size and TTL
- Automatic pruning of expired entries
- Used for video context caching during generation

## Environment Variables

See `.env.example` for all required and optional environment variables.

### Required Variables

- `B2_ENDPOINT` - Backblaze endpoint (e.g., https://s3.us-west-002.backblazeb2.com)
- `B2_KEY_ID` - Backblaze application key ID
- `B2_APPLICATION_KEY` - Backblaze application key secret
- `B2_BUCKET_NAME` - Backblaze bucket for media storage
- `VIDEO_SERVER_URL` - Public URL for this service
- `DATABASE_URL` - PostgreSQL database connection string
- `VERCEL_API_URL` - Vercel API URL for webhook callbacks
- `VERCEL_WEBHOOK_SECRET` - HMAC secret shared with Vercel webhooks
- `VIDEO_SERVER_API_KEY` - API key for Vercel <-> video-server authentication
- `FAL_KEY` - fal.ai API key for Kling video generation
- `RUNWAY_API_KEY` - Runway ML API key for gen4_turbo video generation

### Optional Variables

- `B2_REGION` - Backblaze region (default: `us-west-002`)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (debug/info/warn/error, default: info)
- `FAL_WEBHOOK_URL` - Override fal.ai webhook target (defaults to `${VIDEO_SERVER_URL}/webhooks/fal`)
- `RUNWAY_API_URL` - Override Runway API base URL (default: `https://api.dev.runwayml.com`)
- `RUNWAY_API_VERSION` - Override Runway API version (default: `2024-11-06`)
- `STORAGE_HEALTH_CACHE_MS` - Cache duration for storage health checks (default: 300000 = 5 min)

### Backblaze B2 Configuration

Create an application key with read/write permissions for your media bucket, then add:

- `B2_KEY_ID`
- `B2_APPLICATION_KEY`
- `B2_BUCKET_NAME`
- `B2_ENDPOINT`
- `B2_REGION` (optional if using `us-west-002`)

All uploads use the AWS SDK v3 pointed at the Backblaze endpoint.
Reference `.env.hetzner.example` for a production-ready template.

### fal.ai webhook routing

- **Production** – Point `FAL_WEBHOOK_URL` to the public hostname that fronts this service (typically your ALB DNS name plus `/webhooks/fal`).
- **Local development** – Keep `VIDEO_SERVER_URL=http://localhost:3001` for internal requests, but set `FAL_WEBHOOK_URL` to a public tunnel (ngrok, Cloudflare Tunnel, etc.).
- **Docker Compose** – Export `FAL_WEBHOOK_URL` before running `docker compose` to override the default.

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

3. Start the local development environment:

```bash
docker compose -f apps/video-server/docker-compose.yml up --build
```

4. Or run without Docker:

```bash
npm run dev
```

The server will start on `http://localhost:3001` with hot reload enabled.

### Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

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

```bash
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## API Endpoints

### Health & Status

| Endpoint      | Method | Description                    |
| ------------- | ------ | ------------------------------ |
| `GET /`       | GET    | Server information and status  |
| `GET /health` | GET    | Health check for orchestration |

### Video Generation

| Endpoint               | Method | Description                       |
| ---------------------- | ------ | --------------------------------- |
| `POST /video/generate` | POST   | Start video generation for jobs   |
| `POST /video/cancel`   | POST   | Cancel in-flight video generation |

### Render Jobs

| Endpoint                 | Method | Description                 |
| ------------------------ | ------ | --------------------------- |
| `POST /renders`          | POST   | Queue a Remotion render job |
| `GET /renders/:jobId`    | GET    | Get render job status       |
| `DELETE /renders/:jobId` | DELETE | Cancel a render job         |

### Webhooks

| Endpoint             | Method | Description               |
| -------------------- | ------ | ------------------------- |
| `POST /webhooks/fal` | POST   | fal.ai completion webhook |

### Storage

| Endpoint                   | Method | Description             |
| -------------------------- | ------ | ----------------------- |
| `POST /storage/upload`     | POST   | Upload file to B2       |
| `DELETE /storage/delete`   | DELETE | Delete file from B2     |
| `POST /storage/signed-url` | POST   | Generate pre-signed URL |

## Video Generation Flow

1. **Web app** creates `video_gen_batch` and `video_gen_jobs` records in the database
2. **Web app** calls `POST /video/generate` with job IDs
3. **Video server** reads job details from DB, dispatches to Runway ML (or Kling fallback)
4. **AI service** generates video, calls webhook on completion
5. **Video server** downloads video, uploads to B2, updates job record
6. When all jobs complete, **video server** triggers Remotion composition
7. **Remotion** combines videos into final listing video with transitions
8. **Video server** uploads final video + thumbnail, sends webhook to web app

## Error Handling

### Error Types

- **Storage Errors**: STORAGE_UPLOAD_FAILED, STORAGE_DOWNLOAD_FAILED, STORAGE_DELETE_FAILED
- **AI Generation Errors**: RUNWAY_GENERATION_FAILED, FAL_GENERATION_FAILED
- **Render Errors**: REMOTION_RENDER_FAILED, COMPOSITION_FAILED
- **Webhook Errors**: WEBHOOK_DELIVERY_FAILED
- **Validation Errors**: INVALID_INPUT, MISSING_REQUIRED_FIELD
- **Auth Errors**: UNAUTHORIZED, INVALID_API_KEY

### Error Response Format

```json
{
  "success": false,
  "error": "Error Type",
  "code": "ERROR_CODE",
  "details": { "field": "additionalInfo" }
}
```

## Troubleshooting

### Runway API errors

- Verify `RUNWAY_API_KEY` is set correctly
- Check API version compatibility (default: `2024-11-06`)
- Ensure image URLs are publicly accessible HTTPS URLs

### fal.ai webhook not received

- Verify `FAL_WEBHOOK_URL` is publicly accessible
- Check ngrok tunnel is running for local development
- Verify fal.ai webhook signature validation

### Remotion render failures

- Check clip URLs are accessible from the server
- Verify sufficient memory for video rendering
- Check for orientation mismatches in input videos

### Backblaze access denied

- Verify `B2_KEY_ID`/`B2_APPLICATION_KEY` pair has read/write access to the configured bucket
- Confirm the bucket exists inside the account and matches `B2_BUCKET_NAME`
- Double-check `B2_ENDPOINT` and `B2_REGION` match the bucket's region

### High memory usage

- TTL cache automatically prunes expired entries
- Reduce concurrent render jobs if needed
- Monitor Docker container limits

## License

MIT
