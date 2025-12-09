# AI-Focused Project Notes

## Applied Research: AI Video Models

- Surveyed leading models (Kling, Pika, Runway, Luma) with a focus on photorealism, frame consistency, and API ergonomics for automated pipelines.
- Selected Kling for its balance of quality, predictable latency, and rich webhook support, while keeping abstraction layers flexible enough to swap in future providers.
- Documented evaluation criteria—prompt controllability, asset licensing guarantees, and throttling behavior—to guide future experiments when new models emerge.

## Core AI Responsibilities

- Designed the **video generation pipeline** that generates video using Kling AI model, manages webhook callbacks, and normalizes generated clips for FFmpeg composition.
- Built **job orchestration** around `video_asset_jobs`, giving every room its own retryable AI task so failures in one generation run never block the rest of the asset.
- Developed **storage and metadata synchronization** between Kling outputs, Backblaze buckets, and Drizzle-managed Neon Postgres tables to keep AI artifacts auditable.

## Architecture for AI Compute Costs

- Split the system into a Vercel-hosted Next.js web app and a Hetzner/Coolify-managed video server so high-compute workloads can scale independently.
- Containerized the video server with FFmpeg, fluent-ffmpeg bindings, and worker scripts that can horizontally scale when model usage spikes.
- Implemented **cost-aware scheduling**, batching, and caching strategies (signed image URLs, reusable prompt templates) to minimize redundant calls to expensive AI endpoints.
- Provisioned observability hooks (metrics around job duration, queue depth, webhook retries) to track GPU spend and trigger alerts before costs spike.

## Additional AI Tooling Notes

- Used Claude Code and Codex as pair-programming partners to iterate on FFmpeg filters, webhook handlers, and Drizzle queries more rapidly.
- Maintained tight human review loops on AI-assisted code to prevent regression bugs and ensure consistency across shared packages.
