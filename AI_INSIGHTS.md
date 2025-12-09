# AI-Focused Project Notes

This document details my three major focuses of my CS470 semester project.

## Applied Research: AI Video Models

- I researched Kling, Pika, Runway, and Luma to weigh their pros and cons for generating real estate videos.
- I landed on Kling because it hits the sweet spot for quality plus predictable latency, and it gives me the fast generation I need. I still kept my abstraction thin so I can swap models later if the landscape shifts.
- I also investigated the possiblity of hosting + training my own simple video generation model with a rented GPU, but decided against it for cost reasons.

## Core AI Responsibilities

- I designed the **video generation pipeline**: feed property prompts to Kling AI, normalize the clips, and hand them off to FFmpeg for composition.
- I built the **job orchestration** around `video_asset_jobs`, which basically means every room gets its own retryable AI task so one failure doesn’t take out the entire project.
- I also wired up the **storage and metadata sync** between Kling outputs, Backblaze, and Drizzle/Neon Postgres so every asset is auditable from prompt to final video.

## Architecture for AI Compute Costs

- To keep costs down, I split the stack between a Vercel Next.js front end and a Hetzner/Coolify video server. All the heavy FFmpeg + AI work stays on the box where I control scaling.
- I containerized the video server with FFmpeg, fluent-ffmpeg bindings, and worker scripts so I can spin up more workers when the queue grows.
- I set up observability—job durations, queue depth, webhook retry counts—so I can see GPU spend patterns and react before it gets ugly.
