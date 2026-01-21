All generated content must be returned in this JSON structure:

```json
{
  "hook": "The primary headline designed to stop the scroll",
  "hook_subheader": "Optional secondary line that prompts further engagement",
  "body": null,
  "cta": "Optional call-to-action for final slide or post closing",
  "caption": "The full post caption text that appears when a user clicks on the post"
}
```

### For Carousel Posts

When generating carousel content, set `body` to an array of slide objects:

```json
{
  "hook": "5 Mistakes First-Time Buyers Make",
  "hook_subheader": "Number 3 costs the average buyer $12,000",
  "body": [
    { "header": "Slide Header", "content": "1-2 sentence explanation." }
  ],
  "cta": "Optional CTA for final slide",
  "caption": "Full caption with line breaks"
}
```

### For Single-Image Posts

Set `body` to `null`.
