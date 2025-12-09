# CS470 Final Project Report

This document details my three major focuses of my semester project for creating an AI photo-to-video generation platform for real estate agents.

## Project Overview

- I evaluated Kling, Pika, Runway, and Luma video generation models for their overall efficacy, cost, and stability. I even toyed with self-hosting a lightweight model on rented GPUs, but the ops lift plus compute costs pushed me toward fal.ai’s managed Kling service.
- I designed the video pipeline end to end: property prompts flow to Kling, webhooks return clip metadata, and I normalize everything before FFmpeg composes the final video. Job orchestration via `video_asset_jobs` keeps each room in its own retryable bubble, and storage sync between Kling, Backblaze, and Drizzle/Neon Postgres keeps artifacts traceable.
- To manage compute costs, I split hosting between Vercel (Next.js UI) and a Hetzner/Coolify video server. The server is containerized with FFmpeg + worker scripts for horizontal scaling, and I rely on cost-aware scheduling (batched jobs, reusable prompts, signed image URLs) plus observability hooks (job duration, queue depth, webhook retries) to monitor GPU usage in real time.

## Did It Work?

- The end-to-end video generation does work, but there are still some occasional hiccups. One of the biggest issues is that the AI output varies greatly between generation attemps and does not feel totally stable yet. However, with further optimizations, I am confident this would be stable enough for realtors to actually use!
- Demo video: https://youtu.be/wJld00uWvGg.

## Lessons Learned

- Don’t “accept all” from AI pair programmers—double-checking Claude/Codex suggestions saved me from duplicate logic and regressions.
- Early optimization pays off: designing storage keys, batching strategies, and cost controls upfront made the later scaling work far easier.
- Great design docs make prompting easier; the time I spent writing them unlocked faster iterations with AI copilots.

## What I’d Do Differently

- Decide on the GPU hosting approach earlier. The detour into self-hosting was educational but slowed down my ability to polish observability and UI work.
- Add automated tests for the webhook chain from day one so I’m not relying on manual verification during crunch time.

## AI Tooling Notes

- Claude Code and Codex acted as pair-programming buddies for FFmpeg filters, webhook handlers, and Drizzle queries.
- I still review every AI-generated patch to keep the shared packages clean and avoid regressions.
