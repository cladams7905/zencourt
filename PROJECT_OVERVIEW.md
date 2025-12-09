# Zencourt Project Overview

## Summary

- Zencourt delivers automated, AI-assisted video generation for real estate projects by pairing a Next.js 15 front end with an FFmpeg-powered Express backend.
- Property imagery flows through a multi-stage pipeline that orchestrates Kling AI rendering, composes clips, and syncs final assets back to the web experience via Drizzle-managed Neon Postgres storage.

## Media, Demos, and Diagrams

- Demo video: https://youtu.be/wJld00uWvGg
- Architecture walkthrough: https://youtu.be/xptfLhwNc3U
- Architecture overview (Lucidchart): https://lucid.app/lucidchart/2f0192b7-032c-40ca-ad27-cc494a2e4784/edit?view_items=om18YkcUOZO_&page=0_0&invitationId=inv_52a7e156-a440-4f9f-9e99-69a1bb786bd4
- Zencourt ERD v1: https://drawsql.app/teams/cladams7905/diagrams/zencourt-erd

## What I Learned

This project has taught me a lot about building scalable and robust software architecture. Some of the biggest learnings included how to use Docker for containerizing applications, as well as how to use Cloudfare for configuring caching, DNS, and proxying. Another big learning from this project was how important it is to consider architectural decisions from a cost and scalability perspective. Throughout this semester, I have had to make several architectural redesigns to better optimize my video generation pipeline for speed, cost, and efficiency.

## AI Integration

The platform deeply integrates AI by dispatching each room-level video job to fal.ai's Kling model, tracking webhook callbacks, and composing the generated clips into a branded property tour.

## AI Assistance in Development

I used Claude Code and Codex throughout the build for ideation, refactors, and troubleshooting across the Next.js, Express, and FFmpeg layers.

## Why This Project Matters to Me

This project matters to me because I intend to build this product into a startup after graduating in December, with the goal to eventually turn this into a full-fledged SaaS.

## Key Learnings

- **Don't simply "accept all" on AI-generated code**: When I first began building this project, there were several times where I didn't review any AI-generated code and it came back to bite me. The AI created lots of code duplication and small bugs that if I had caught in the moment would have saved me hours of development time.

- **Optimize early to save time & money later**: There have been lots of opportunities for optimization in my video generation logic along the way, and identifying these optimizations now will (hopefully) pay off a lot in the long run when I begin scaling.

- **The biggest bottleneck in writing good software is writing good design docs**: Having a well thought-out and detailed design plan going into a coding session makes prompting AI so much more effective.

## Architecture, Reliability, and Performance Notes

- **Failover & retries:** Video generation is split into `video_asset_jobs`, enabling granular retries per room and minimizing the blast radius of third-party failures. Webhooks from fal.ai are validated and replayed if downstream delivery fails.
- **Scaling:** The separation of the Hetzner-hosted video server from the Vercel web app allows independent scaling; jobs can be parallelized horizontally by running multiple workers that pull from the same Postgres + Backblaze storage.
- **Performance:** FFmpeg processing runs on dedicated compute with streaming uploads to S3-compatible storage; the web app consumes status updates via Drizzle and Stack Auth to keep UI responsive without blocking user interactions.
- **Authentication:** Stack Auth enforces session cookies on the web front end, while video-server middleware validates shared secrets for webhooks and API calls before mutating database state.
- **Concurrency:** Job orchestration coordinates multiple asynchronous Kling runs, ensuring that composition only begins once every job reports completion.

## Class Channel Post

https://teams.microsoft.com/l/message/19:876110baafed41c5b8641a41f98baab2@thread.tacv2/1765304592922?tenantId=c6fc6e9b-51fb-48a8-b779-9ee564b40413&groupId=null&parentMessageId=1765304592922&teamName=CS%20452%20002%20(Fall%202025)&channelName=Report%20-%20Final%20Project&createdTime=1765304592922

## Sharing Preference

**No, don't share.**
