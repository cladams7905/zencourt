# High-Level Project Directives

## Self-Improvement Loop

When a user corrects you or gives feedback that reveals a misunderstanding or better approach:

1. Record the high-level lesson or guideline in this file.
2. Add it under the "Recorded Guidance" section below in a concise, reusable form.
3. Apply it in future interactions.

Use this loop to avoid repeating mistakes and to align with the user's preferences over time. Avoid overly specific guidance and focus on general project-level directives that will be universally applicable.

### Recorded Guidance

- For video generation workflows, target specific workflow instances by batch id rather than listing id when creating, reading, updating, or canceling jobs; reserve listing-scoped actions for explicitly whole-listing operations.
- For small front end layout-only tweaks, implement the UI change directly unless a test adds clear behavioral value beyond asserting presentation.
- For optimistic UI around async workflows, never derive the rollback state from a potentially updated live snapshot at cancel time; preserve or reconstruct the last known completed state explicitly.
- For Drizzle schema changes, do not hand-write migration files or journal entries; update the schema and run `npm run db:generate` to produce migration artifacts.
- For third-party integrations, if the user provides an explicit API contract, implement against that contract directly instead of inferring alternate endpoints or response shapes.
- For provider webhooks in local development, route callback URLs through the same public tunnel infrastructure already used for comparable providers instead of defaulting new providers to internal-only callback paths.
- For early-stage clean-break refactors, prefer replacing outdated fields and semantics outright instead of preserving backward compatibility layers or soft-deprecated aliases.
- For storage-hosted example media, use the explicit CDN URL pattern the user provides rather than assuming app-relative `/assets/...` paths.

---
