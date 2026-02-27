# Orshot API Reference (Detailed)

Use this file when you need element schemas, canvas config, full endpoint details, design guidelines, or troubleshooting.

## SDKs

### Node.js
```bash
npm install orshot
```
```js
import { Orshot } from "orshot";
const orshot = new Orshot("<ORSHOT_API_KEY>");
```

### Python
```bash
pip install orshot
```
```python
import orshot
os = orshot.Orshot('<ORSHOT_API_KEY>')
response = os.render_from_template({
  'template_id': 'open-graph-image-1',
  'modifications': {'title': 'Hello World'},
  'response_type': 'base64',
  'response_format': 'png'
})
```

### Other
- **PHP:** `composer require nicholasgriffintn/orshot-php`
- **Ruby:** `gem install orshot`

---

## Template Architecture

### Template Structure

```
Template
├── id: number | string
├── name: string
├── description: string
├── width: number
├── height: number
├── pages_data: Array
    └── Page
        ├── id: string (UUID)
        ├── name: string
        ├── canvas: CanvasConfig
        ├── elements: Element[]
        ├── modifications: Modification[]
        └── thumbnail_url: string | null
```

### Canvas Configuration

| Property          | Type   | Default         | Description                               |
| ----------------- | ------ | --------------- | ----------------------------------------- |
| `width`           | number | 800             | Canvas width in pixels (max: 5000)        |
| `height`          | number | 800             | Canvas height in pixels (max: 5000)       |
| `backgroundColor` | string | "#ffffff"       | Background color (hex, rgba, gradient)    |
| `backgroundImage` | string | ""              | URL to background image                   |
| `borderWidth`     | number | 0               | Border width in pixels                    |
| `borderColor`     | string | "rgba(0,0,0,1)" | Border color                              |
| `borderStyle`     | string | "solid"         | Border style (solid, dashed, etc)         |

### Canvas Size Presets

| Name                 | Dimensions | Use Case                        |
| -------------------- | ---------- | ------------------------------- |
| Square               | 1080×1080  | Instagram posts, general social |
| Instagram Story      | 1080×1920  | Stories, Reels, TikTok          |
| Slide/Presentation   | 1920×1080  | Presentations, slides           |
| YouTube Thumbnail    | 1280×720   | Video thumbnails                |
| Twitter Post         | 1600×900   | X/Twitter posts                 |
| Open Graph           | 1200×630   | Link previews, Facebook         |
| Pinterest Pin        | 1000×1500  | Pinterest                       |
| A4 Document          | 2480×3508  | Print documents                 |
| App Store Screenshot | 1290×2796  | iOS app screenshots             |

### Universal Element Properties

| Property            | Type    | Description                      |
| ------------------- | ------- | -------------------------------- |
| `id`                | string  | Unique identifier (UUID)         |
| `name`              | string  | Display name (was `layerName`)   |
| `type`              | string  | "text", "image", "shape", "video"|
| `position`          | object  | `{ x: number, y: number }`       |
| `dimensions`        | object  | `{ width: number, height: number }` |
| `rotation`          | number  | Degrees (0-360)                  |
| `zIndex`            | number  | Layer order (higher = on top)    |
| `aspectRatioLocked` | boolean | Lock aspect ratio                |
| `isHidden`          | boolean | Hide from render                 |
| `skewX`, `skewY`    | number  | Skew angles                      |

### Text Element

```javascript
{
  type: "text",
  content: string,
  layerName: string,
  position: { x, y },
  dimensions: { width, height },
  style: {
    fontFamily, fontSize, fontWeight, fontStyle, lineHeight, letterSpacing,
    fill, color, opacity, stroke, strokeWidth,
    textAlign, verticalAlign, textTransform, textDecoration, textMode,
    paddingX, paddingY, borderColor, borderWidth, borderRadius,
    textBackgroundColor, textBackgroundRadius, textStrokeColor, textStrokeWidth,
    minFontSize, filter, mixBlendMode,
    boxShadowX/Y/Blur/Color, dropShadowX/Y/Blur/Color
  },
  parameterizable: true,
  parameterId: "headline",
  parameterType: "text"
}
```

Gradient text: `color: "linear-gradient(90deg, #FF6B6B 0%, #4ECDC4 100%)"`

### Image Element

```javascript
{
  type: "image",
  content: string,  // URL (preferred), base64
  isSvg: boolean,
  style: {
    objectFit, objectPosition, opacity, fill, stroke,
    borderRadius, borderWidth, borderColor,
    filter, mixBlendMode, boxShadow*, dropShadow*,
    svgColor  // Recolor monochrome SVGs
  },
  parameterType: "imageUrl"
}
```

### Shape Element

```javascript
{
  type: "shape",
  shapeType: "rectangle" | "circle" | "arrow",
  style: {
    fill, stroke, strokeWidth, borderRadius, borderWidth, borderColor,
    opacity, filter, mixBlendMode, boxShadow*, dropShadow*
  },
  parameterType: "fill"
}
```

Gradient fills: `fill: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)"`

### Video Element

```javascript
{
  type: "video",
  content: string,  // Public URL (MP4, WebM, MOV; H.264 preferred)
  videoOptions: { loop, muted, trim_start_time, trim_end_time, duration },
  style: {
    objectFit, objectPosition, opacity, filter, mixBlendMode,
    borderRadius, borderWidth, borderColor, elementBoxShadow*
  },
  parameterType: "videoUrl"
}
```

---

## API Endpoints

### Render from Studio Template
**POST** `https://api.orshot.com/v1/studio/render`

```js
{
  templateId: 123,
  modifications: { ... },
  response: {
    type: "base64" | "url" | "binary",
    format: "png" | "webp" | "jpg" | "pdf" | "mp4" | "webm" | "gif",
    scale: 1,
    includePages: [1, 3],
    fileName: "my-render"
  },
  pdfOptions: { margin, rangeFrom, rangeTo, colorMode: "rgb"|"cmyk", dpi }
}
```

### Render from Utility Template
**POST** `https://api.orshot.com/v1/generate/{images|pdfs}`

### Signed URL
**POST** `https://api.orshot.com/v1/signed-url/create`

### Studio Templates
- **GET** `/v1/studio/templates/all?page=1&limit=10`
- **GET** `/v1/studio/templates/:templateId`
- **DELETE** `/v1/studio/templates/:templateId`
- **POST** `/v1/studio/templates/:templateId/duplicate`

### Enterprise (Create/Update)
- **POST** `/v1/studio/templates/create`
- **PATCH** `/v1/studio/templates/:templateId`
- **PATCH** `/v1/studio/templates/:templateId/update-modifications`
- **POST** `/v1/studio/templates/:templateId/generate-variants`

### Brand Assets
- **POST** `/v1/brand-assets/upload` (multipart, file field, max 5MB)
- **GET** `/v1/brand-assets`
- **DELETE** `/v1/brand-assets/:assetId`

### Dynamic URLs
```
https://api.orshot.com/v1/studio/dynamic-url/my-image?title=Hello&title.fontSize=48px
```
URL-encode `#` as `%23`.

---

## Dynamic Parameters (Render Time)

### Style: `parameterId.property`

**Text:** fontSize, fontWeight, fontStyle, fontFamily, lineHeight, letterSpacing, textAlign, verticalAlign, textDecoration, textTransform, color, backgroundColor, backgroundRadius, textStrokeWidth, textStrokeColor, opacity, filter, dropShadow*

**Image:** objectFit, objectPosition, borderRadius, borderWidth, borderColor, boxShadow*, opacity, filter

**Shape:** fill, stroke, strokeWidth, borderRadius, opacity

**All elements:** x, y, width, height

Property names are **case-insensitive**.

### AI Content (.prompt)
- Text: `openai/gpt-5-nano`
- Image: `google/nano-banana`

### PDF Links (.href)
```json
{ "cta_button.href": "https://example.com/signup", "response": { "format": "pdf" } }
```

### Video Parameters
```json
{
  "bgVideo": "https://example.com/video.mp4",
  "bgVideo.trimStart": 5,
  "bgVideo.trimEnd": 15,
  "bgVideo.muted": false,
  "bgVideo.loop": true
}
```

---

## Render Usage & Costs

| Output               | Cost                 |
| -------------------- | -------------------- |
| Image (PNG/JPG/WebP) | 2 renders per image  |
| PDF                  | 2 renders per page   |
| Video (MP4/WebM/GIF) | 2 renders per second |

---

## Design Guidelines

**Typography:** 2–3 fonts max; headings 1.5–2× body size; min 24px for social; headings 600–900, body 400–500. Pairings: Prata+Inter, Instrument Serif+DM Sans, Playfair+Lato.

**Colors:** 4.5:1 contrast; 3–5 colors max. Palettes: Gold (#D4AF37, #B8860B), iOS (#007AFF, #8E8E93), Dark (#0F172A, #1E293B).

**Layout:** 40–60px edge padding; 20–40px between elements. zIndex: background 1, overlays 2–3, text 4–6, interactive 7+.

---

## Common Error Codes

| Code | Error                          | Fix                                          |
| ---- | ------------------------------ | -------------------------------------------- |
| 400  | `templateId missing`           | Add `templateId` to request body             |
| 400  | `Invalid API Key`              | Generate new key from dashboard              |
| 403  | `Authorization header missing` | Add `Authorization: Bearer <KEY>` header     |
| 403  | `Subscription inactive`        | Check usage or upgrade plan                  |
| 403  | `Template not found`           | Verify template ID belongs to your workspace |
| 403  | `Video on free plan`           | Upgrade for video generation                 |

---

## Links

- Docs: https://orshot.com/docs
- API Reference: https://orshot.com/docs/api-reference
- Integrations: https://orshot.com/integrations
- MCP Server: https://orshot.com/docs/integrations/mcp-server
- Templates: https://orshot.com/templates
- Pricing: https://orshot.com/pricing
