# AI-Focused Workflow Estimates

| Dates        | Phase                       | Task                                              | Notes                                                                    | Est. Hours |
| ------------ | --------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------ | ---------- |
| Nov 1–5      | Research                    | Compare Kling, Pika, Runway, Luma models          | Evaluated image-to-video quality, webhook support, licensing constraints | 6          |
| Nov 6–10     | AI Video Generation Design  | Use Kling AI to build video gen. pipeline         | Defined `video_asset_jobs`, retry model, and webhook contract            | 8          |
| Nov 11–14    | Storage & Metadata          | Normalize Kling outputs into Backblaze + Postgres | Implemented asset keying, signed URLs, and DB synchronization            | 5          |
| Nov 15–18    | FFmpeg Integration          | Compose AI clips into branded reels               | Built filters, transitions, failover steps for AI media                  | 6          |
| Nov 19–24    | Cost & Hosting Architecture | Separate web vs. video-server infrastructure      | Designed Hetzner/Coolify deployment, scaling, and monitoring             | 7          |
| Nov 25–29    | Observability & Controls    | Metrics, alerts, and throttling for AI usage      | Added job duration tracking, queue depth checks, and cache strategies    | 4          |
| Nov 30–Dec 4 | AI Pair Programming         | Claude Code + Codex assisted refactors            | Prompting, review loops, and consolidation of AI-generated patches       | 3          |

**Total AI-focused hours (estimate): 39**
