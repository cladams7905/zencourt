---
name: orshot
description: Generate images, PDFs, and videos programmatically using the Orshot API. Use when building visual content automation, marketing image generation, certificate/invoice PDFs, social media carousels, video generation from templates, or when working with Orshot API, SDKs, or integrations.
---

# Orshot – Automated Visual Content Generation

[Orshot](https://orshot.com) generates images, PDFs, and videos from templates via REST API or SDKs. Design templates in Orshot Studio (or import from Canva/Figma), then render programmatically.

- **Docs:** https://orshot.com/docs
- **API Base:** https://api.orshot.com/v1

## When to Use

- Generating images, PDFs, or videos from templates
- Building marketing visual pipelines or social content (carousels, stories)
- Creating certificates, invoices, tickets, or reports as PDFs
- Image generation APIs for SaaS
- Orshot API, SDK, or integration work

## Quick Start

### Authentication

```
Authorization: Bearer <ORSHOT_API_KEY>
```

Get the key from **Workspace Settings → API Keys** in the Orshot dashboard.

### Render from Template

**Node.js:**

```bash
npm install orshot
```

```js
import { Orshot } from "orshot";
const orshot = new Orshot("<ORSHOT_API_KEY>");

const response = await orshot.renderFromTemplate({
  templateId: "open-graph-image-1",
  modifications: { title: "Hello World" },
  responseType: "base64", // "base64" | "url" | "binary"
  responseFormat: "png" // "png" | "webp" | "jpg" | "pdf"
});
```

**Direct API (POST):**

```js
await fetch("https://api.orshot.com/v1/studio/render", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer <ORSHOT_API_KEY>"
  },
  body: JSON.stringify({
    templateId: 123,
    modifications: { title: "Hello World", imageUrl: "https://example.com/photo.jpg" },
    response: { type: "url", format: "png" }
  })
});
```

### Signed URLs (no API key exposure)

```js
const signedUrl = await orshot.generateSignedUrl({
  templateId: "open-graph-image-1",
  modifications: { title: "Hello" },
  expiresAt: 1744276943,
  renderType: "images",
  responseFormat: "png"
});
```

## Parameterization (Critical)

Dynamic elements require:

```js
{
  parameterizable: true,
  parameterId: "unique_id",  // snake_case, unique per template
  parameterType: "text" | "imageUrl" | "videoUrl"
}
```

| Element | parameterId examples      | parameterType |
| ------- | ------------------------- | ------------- |
| Text    | `headline`, `subtitle`    | `"text"`      |
| Image   | `product_image`, `logo`   | `"imageUrl"`  |
| Video   | `hero_video`              | `"videoUrl"`  |

### Style Overrides (Dot Notation)

```json
{
  "modifications": {
    "title": "Hello World",
    "title.fontSize": "48px",
    "title.color": "#ff0000",
    "logo.borderRadius": "50%",
    "logo.objectFit": "cover"
  }
}
```

Multi-page: prefix with page, e.g. `page1@title`, `page2@title`.

### AI Content (.prompt)

```json
{
  "modifications": {
    "headline.prompt": "Write a catchy headline about coffee",
    "background.prompt": "A serene mountain landscape at sunset"
  }
}
```

## Response Options

| Type     | Use case                    |
| -------- | --------------------------- |
| `url`    | Production (avoids payload) |
| `base64` | Inline embedding            |
| `binary` | Custom handling             |

| Format | Notes                         |
| ------ | ----------------------------- |
| `png`  | Best quality                  |
| `webp` | Smaller, good quality         |
| `jpg`  | Compressed, no transparency   |
| `pdf`  | Multi-page, links, CMYK       |
| `mp4`  | Video, H.264                  |

## Best Practices

1. Use `url` + `webp` for production
2. Use style parameters instead of multiple template variants
3. Multi-page: `page1@paramId` format
4. Handle 400/403; check `Invalid API Key`, `Template not found`, `Subscription inactive`

## Additional Resources

- **Full API reference, element specs, canvas presets, design guidelines, error codes:** see [reference.md](reference.md)
- **Documentation:** https://orshot.com/docs
- **API Reference:** https://orshot.com/docs/api-reference
