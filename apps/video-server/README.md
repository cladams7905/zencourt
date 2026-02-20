# Zencourt Video Processing Server

Express server for AI-powered video generation and composition, designed to run on Hetzner Cloud with Backblaze B2 storage.

## Overview

This server handles video generation and composition for the Zencourt platform. It receives video processing requests from the Vercel Next.js frontend, generates videos using AI services (Runway ML, Kling/fal.ai), composes them with Remotion, stores results in Backblaze B2 object storage, and sends webhook notifications when complete.

## Architecture

- **Runtime**: Node.js 20+
- **Framework**: Express 4.x with TypeScript
- **AI Video Generation**: Provider-agnostic orchestration with Runway/Kling providers
- **Video Composition**: Render service with Remotion provider
- **Storage**: Backblaze B2 via AWS SDK v3
- **Logging**: Pino (structured JSON logs)
- **Deployment**: Docker container on Hetzner Cloud (or local Docker)

## Get Started

The script `apps/video-server/scripts/start-dev-server.sh` automates spinning up an ngrok tunnel and launching Docker Compose with the correct `FAL_WEBHOOK_URL`.

Requirements:

- `ngrok` CLI installed and authenticated (`ngrok config add-authtoken ...`)
- `curl` and `python3` available locally

### Quick setup

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

```text
apps/video-server/
├── src/
│   ├── server.ts                      # Express initialization + graceful shutdown
│   ├── config/
│   │   ├── env.ts
│   │   ├── logger.ts
│   │   └── storage.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── errorHandler.ts
│   ├── routes/
│   │   ├── _shared/
│   │   ├── health/
│   │   │   ├── route.ts
│   │   │   ├── domain/
│   │   │   └── orchestrators/
│   │   ├── renders/
│   │   │   ├── route.ts
│   │   │   ├── domain/
│   │   │   └── orchestrators/
│   │   ├── storage/
│   │   │   ├── route.ts
│   │   │   ├── domain/
│   │   │   └── orchestrators/
│   │   ├── video/
│   │   │   ├── route.ts
│   │   │   ├── domain/
│   │   │   └── orchestrators/
│   │   └── webhooks/
│   │       ├── route.ts
│   │       ├── domain/
│   │       └── orchestrators/
│   └── services/
│       ├── providers/
│       │   ├── kling/
│       │   └── runway/
│       ├── render/
│       │   ├── service.ts
│       │   ├── queue.ts
│       │   ├── domain/composition.ts
│       │   └── providers/remotion/
│       │       ├── index.ts
│       │       ├── provider.ts
│       │       └── composition/
│       │           ├── Root.tsx
│       │           └── ListingVideo.tsx
│       ├── storage/
│       ├── videoGeneration/
│       │   ├── service.ts
│       │   ├── adapters/
│       │   ├── domain/
│       │   ├── facades/
│       │   ├── orchestrators/
│       │   └── strategies/
│       └── webhook/
├── Dockerfile
├── docker-compose.yml
├── scripts/
│   └── start-dev-server.sh
└── package.json
```

## Key Modules

### Video Generation (`src/services/videoGeneration`)

Orchestrates the full generation lifecycle:

- Receives generation requests from routes
- Dispatches provider jobs via facade + strategies
- Handles provider webhook completion events
- Downloads provider outputs and persists artifacts
- Triggers downstream composition when all jobs settle

**Video batch workflow note:** the parent `video_gen_batch` record is treated as a run/batch only. Final asset URLs live on the `content` row when a user saves a draft/favorite. Individual clip URLs and thumbnails are stored on `video_gen_jobs`.

### Providers (`src/services/providers`)

Provider-specific integrations are isolated here:

- `runway/` - Runway ML SDK integration
- `kling/` - Kling/fal.ai integration

Only these modules should contain provider-specific semantics.

### Render (`src/services/render`)

Handles composition and render job lifecycle:

- Queue orchestration (`queue.ts`)
- Provider abstraction (`ports.ts`)
- Remotion provider implementation (`providers/remotion/provider.ts`)
- Composition React root/component (`providers/remotion/composition/*`)

### Storage (`src/services/storage`)

Backblaze B2 operations:

- Upload, delete, and URL operations
- Signed URL generation
- Health checks and storage URL handling

### Webhook (`src/services/webhook`)

Outbound webhook delivery with retry/backoff and structured logging.

## Environment Variables

See `.env.example` for all required and optional environment variables.

### Required Variables

- `B2_ENDPOINT` - Backblaze endpoint (e.g., https://s3.us-west-002.backblazeb2.com)
- `B2_KEY_ID` - Backblaze application key ID
- `B2_APPLICATION_KEY` - Backblaze application key secret
- `B2_BUCKET_NAME` - Backblaze bucket for media storage
- `VIDEO_SERVER_URL` - Public URL for this service
- `DATABASE_URL` - PostgreSQL database connection string
- `VERCEL_API_URL` - Web app API URL for webhook callbacks
- `VERCEL_WEBHOOK_SECRET` - Shared signing secret for callback validation
- `VIDEO_SERVER_API_KEY` - API key for web <-> video-server auth
- `FAL_KEY` - fal.ai API key
- `RUNWAY_API_KEY` - Runway ML API key

### Optional Variables

- `B2_REGION` - Backblaze region (default: `us-west-002`)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (default: `info`)
- `FAL_WEBHOOK_URL` - Override fal.ai webhook target
- `RUNWAY_API_URL` - Override Runway API base URL
- `RUNWAY_API_VERSION` - Override Runway API version
- `STORAGE_HEALTH_CACHE_MS` - Storage health cache duration (ms)

### fal.ai webhook routing

- **Production**: Point `FAL_WEBHOOK_URL` to the public hostname fronting this service (`.../webhooks/fal`).
- **Local development**: Keep `VIDEO_SERVER_URL=http://localhost:3001`, set `FAL_WEBHOOK_URL` to a public tunnel.
- **Docker Compose**: Export `FAL_WEBHOOK_URL` before running compose to override defaults.

## Development

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for local services)

### Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables (`.env.local` / `.env` as used in your workflow).

3. Start local development with tunnel + Docker:

```bash
apps/video-server/scripts/start-dev-server.sh up --build
```

4. Or run service directly:

```bash
npm run dev --workspace=@zencourt/video-server
```

### Build

```bash
npm run build --workspace=@zencourt/video-server
```

### Type checking

```bash
npm run type-check --workspace=@zencourt/video-server
```

### Testing

```bash
npm run test --workspace=@zencourt/video-server
npm run test:watch --workspace=@zencourt/video-server
npm run test:coverage --workspace=@zencourt/video-server
```

## API Endpoints

### Health & Status

| Endpoint      | Method | Description                   |
| ------------- | ------ | ----------------------------- |
| `GET /`       | GET    | Server information and status |
| `GET /health` | GET    | Health check                  |

### Video Generation

| Endpoint               | Method | Description                     |
| ---------------------- | ------ | ------------------------------- |
| `POST /video/generate` | POST   | Start generation for job IDs    |
| `POST /video/cancel`   | POST   | Cancel in-flight video jobs     |

### Render Jobs

| Endpoint                 | Method | Description                 |
| ------------------------ | ------ | --------------------------- |
| `POST /renders`          | POST   | Queue a render job          |
| `GET /renders/:jobId`    | GET    | Get render job status       |
| `DELETE /renders/:jobId` | DELETE | Cancel a render job         |

### Webhooks

| Endpoint             | Method | Description                  |
| -------------------- | ------ | ---------------------------- |
| `POST /webhooks/fal` | POST   | fal.ai completion webhook    |

### Storage

| Endpoint                   | Method | Description             |
| -------------------------- | ------ | ----------------------- |
| `POST /storage/upload`     | POST   | Upload file to B2       |
| `DELETE /storage/delete`   | DELETE | Delete file from B2     |
| `POST /storage/signed-url` | POST   | Generate pre-signed URL |

## Video Generation Flow

1. Web app creates `video_gen_batch` + `video_gen_jobs` records.
2. Web app calls `POST /video/generate` with job IDs.
3. Video server dispatches jobs to provider strategies.
4. Provider sends completion webhook (`/webhooks/fal`).
5. Video server downloads output, uploads artifacts to B2, updates job rows.
6. When jobs complete, video server queues a render.
7. Remotion provider composes final listing video + thumbnail.
8. Video server notifies web app via webhook.

## Troubleshooting

### Runway API errors

- Verify `RUNWAY_API_KEY`
- Check API version compatibility (default: `2024-11-06`)
- Ensure source image URLs are publicly accessible HTTPS URLs

### fal.ai webhook not received

- Verify `FAL_WEBHOOK_URL` is publicly reachable
- For local development, ensure tunnel is active
- Verify webhook signature validation settings

### Remotion render failures

- Check clip URLs are reachable from the server
- Verify sufficient memory/CPU for rendering
- Check orientation input consistency

### Backblaze access denied

- Verify `B2_KEY_ID`/`B2_APPLICATION_KEY` permissions
- Confirm bucket name and region match configuration
- Validate endpoint/region env values
