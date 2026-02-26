---
name: orshot
description: Generate images, PDFs, and videos programmatically using the Orshot API. Use when building visual content automation, marketing image generation, certificate/invoice PDFs, social media carousels, or video generation from templates.
metadata:
  author: Rishi Mohan
  version: "1.0.0"
---

# Orshot – Automated Visual Content Generation

[Orshot](https://orshot.com) is an automated image, PDF, and video generation platform. Design templates in Orshot Studio (or import from Canva/Figma), then generate renders via REST API, SDKs, or no-code integrations.

- **Documentation:** https://orshot.com/docs
- **API Base URL:** https://api.orshot.com/v1

## When to Use This Skill

Use this skill when:

- Generating images, PDFs, or videos programmatically from templates
- Building automated marketing visual pipelines
- Creating dynamic social media content (carousels, posts, stories)
- Generating certificates, invoices, tickets, or reports as PDFs
- Building image generation APIs for SaaS products
- Automating visual content with Zapier, Make, n8n, or Airtable
- Embedding a design editor into an application
- Working with Orshot API, SDKs, or integrations

## Getting Started

### Authentication

All API requests require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <ORSHOT_API_KEY>
```

[Get your API key](https://orshot.com/docs/quick-start/get-api-key) from **Workspace Settings → API Keys** in the Orshot dashboard.

### SDKs

#### Node.js

```bash
npm install orshot
```

```js
import { Orshot } from "orshot";
const orshot = new Orshot("<ORSHOT_API_KEY>");

// Render from template
const response = await orshot.renderFromTemplate({
  templateId: "open-graph-image-1",
  modifications: { title: "Hello World" },
  responseType: "base64", // "base64" | "url" | "binary"
  responseFormat: "png" // "png" | "webp" | "jpg" | "pdf"
});

// Generate signed URL
const signedUrl = await orshot.generateSignedUrl({
  templateId: "open-graph-image-1",
  modifications: { title: "Hello" },
  expiresAt: 1744276943,
  renderType: "images",
  responseFormat: "png"
});
```

#### Python

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

#### Other SDKs

- **PHP:** `composer require nicholasgriffintn/orshot-php`
- **Ruby:** `gem install orshot`

## Template Architecture

This section describes the complete structure of an Orshot template for MCP tools and AI agents.

### Template Structure

An Orshot template consists of **pages**, each containing a **canvas** and **elements**.

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
            ├── width: number
            ├── height: number
            ├── backgroundColor: string
            ├── backgroundImage: string
        ├── elements: Element[]
        ├── modifications: Modification[] (API parameters)
            ├── id: string
            ├── type: string
            ├── element: Element
            ├── description: string
        └── thumbnail_url: string | null
```

### Canvas Configuration

| Property          | Type   | Default         | Description                               |
| ----------------- | ------ | --------------- | ----------------------------------------- |
| `width`           | number | 800             | Canvas width in pixels (max: 5000)        |
| `height`          | number | 800             | Canvas height in pixels (max: 5000)       |
| `backgroundColor` | string | "#ffffff"       | Background color (hex, rgba, or gradient) |
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

All elements share these base properties:

| Property            | Type    | Description                                  |
| ------------------- | ------- | -------------------------------------------- |
| `id`                | string  | Unique identifier (UUID)                     |
| `name`              | string  | Display name in layer list (was `layerName`) |
| `type`              | string  | "text", "image", "shape", "video"            |
| `position`          | object  | `{ x: number, y: number }` from top-left     |
| `dimensions`        | object  | `{ width: number, height: number }`          |
| `rotation`          | number  | Rotation in degrees (0-360)                  |
| `zIndex`            | number  | Layer order (higher = on top)                |
| `aspectRatioLocked` | boolean | Lock aspect ratio during resize              |
| `isHidden`          | boolean | Hide element from render                     |
| `skewX`             | number  | Horizontal skew angle                        |
| `skewY`             | number  | Vertical skew angle                          |

### Text Element

**Content Types:**

- **Plain text**: `"Hello World"` - Standard text string
- **Multi-line**: Use `\n` for line breaks: `"Line 1\nLine 2"`
- **Dynamic via API**: Use `.prompt` modifier for AI-generated text

```javascript
{
  type: "text",
  content: string,          // Plain text string
  layerName: string,        // Display name
  zIndex: number,
  rotation: number,
  position: { x: number, y: number },
  dimensions: { width: number, height: number },
  style: {
    // Typography
    fontFamily: string,     // e.g., "Inter", "Prata", "SF Pro"
    fontSize: string,       // e.g., "48px"
    fontWeight: string | number, // "400", "700", 700
    fontStyle: string,      // "normal", "italic"
    lineHeight: number,     // e.g., 1.2
    letterSpacing: string,  // e.g., "0px", "2px"

    // Appearance
    fill: string,           // Color or gradient
    color: string,          // Hex or rgba
    opacity: number,        // 0-1
    stroke: string,         // Stroke color
    strokeWidth: string,    // e.g., "0px"

    // Alignment & Layout
    textAlign: string,      // "left", "center", "right"
    verticalAlign: string,  // "flex-start", "center", "flex-end"
    textTransform: string,  // "none", "uppercase"
    textDecoration: string, // "none", "underline"
    textMode: string,       // "overflow", "fit"
    paddingX: string,
    paddingY: string,

    // Borders & Backgrounds
    borderColor: string,
    borderWidth: string,
    borderRadius: string,
    textBackgroundColor: string,
    textBackgroundRadius: string,
    textStrokeColor: string,
    textStrokeWidth: string,

    // Effects
    minFontSize: string,    // For "fit" mode
    filter: string,         // e.g., "blur(0px)"
    mixBlendMode: string,   // "normal", "multiply", etc.
    boxShadowX: string,
    boxShadowY: string,
    boxShadowBlur: string,
    boxShadowColor: string,
    dropShadowX: string,
    dropShadowY: string,
    dropShadowBlur: string,
    dropShadowColor: string
  },
  // Parameterization
  parameterizable: boolean,
  parameterId: string,
  parameterType: "text"
}
```

**Gradient text:**

```javascript
color: "linear-gradient(90deg, #FF6B6B 0%, #4ECDC4 100%)";
```

### Image Element

**Content Types:**

- **URL** (recommended): `"https://example.com/image.png"` - Best for dynamic content
- **Base64**: `"data:image/png;base64,iVBORw0KGgo..."` - For embedded images
- **Binary**: Raw binary data (API upload only)

```javascript
{
  type: "image",
  content: string,          // URL (preferred), base64, or binary
  isSvg: boolean,
  layerName: string,
  style: {
    // Sizing & Positioning
    objectFit: string,      // "contain", "cover", "fill"
    objectPosition: string, // "center", "top left"

    // Appearance
    opacity: number,
    fill: string,           // Background fill
    stroke: string,         // Border stroke

    // Borders
    borderRadius: string,   // "0px", "12px", "50%"
    borderWidth: string,
    borderColor: string,

    // Effects
    filter: string,         // "blur(2px)", "grayscale(100%)"
    mixBlendMode: string,
    boxShadowX: string,
    boxShadowY: string,
    boxShadowBlur: string,
    boxShadowColor: string,
    dropShadowX: string,
    dropShadowY: string,
    dropShadowBlur: string,
    dropShadowColor: string,

    svgColor: string        // Recolor monochrome SVGs
  },
  parameterType: "imageUrl"
}
```

### Shape Element

```javascript
{
  type: "shape",
  shapeType: string,        // "rectangle", "circle", "arrow"
  layerName: string,
  style: {
    // Fill & Stroke
    fill: string,           // Color or gradient
    stroke: string,
    strokeWidth: string,    // e.g. "0px"

    // Dimensions
    borderRadius: string,   // Rectangle only
    borderWidth: string,
    borderColor: string,
    borderStyle: string,

    // Appearance
    opacity: number,
    filter: string,
    mixBlendMode: string,

    // Shadows
    boxShadowX: string,
    boxShadowY: string,
    boxShadowBlur: string,
    boxShadowColor: string,
    dropShadowX: string,
    dropShadowY: string,
    dropShadowBlur: string,
    dropShadowColor: string
  },
  parameterType: "fill"
}
```

**Gradient fills:**

```javascript
fill: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)";
fill: "radial-gradient(circle at center, #FF6B6B 0%, #4ECDC4 100%)";
```

### Video Element

**Content Types:**

- **URL** (required): `"https://example.com/video.mp4"` - Must be a publicly accessible URL
- Supported formats: MP4, WebM, MOV
- For best results, use MP4 with H.264 codec

```javascript
{
  type: "video",
  content: string,          // Video URL (must be publicly accessible)
  videoOptions: {
    loop: boolean,
    muted: boolean,
    trim_start_time: string,
    trim_end_time: string,
    duration: number | null
  },
  style: {
    // Sizing & Positioning
    objectFit: string,      // "contain", "cover", "fill"
    objectPosition: string,

    // Appearance
    opacity: number,
    filter: string,
    mixBlendMode: string,

    // Borders & Shadows
    borderRadius: string,
    borderWidth: string,
    borderColor: string,
    elementBoxShadowX: string,
    elementBoxShadowY: string,
    elementBoxShadowBlur: string,
    elementBoxShadowColor: string
  },
  parameterType: "videoUrl"
}
```

### Parameterization Best Practices

When creating or updating templates, **always ensure all text, image, and video elements are parameterizable** with unique IDs. This enables dynamic content replacement via the API.

#### Required Setup

Every dynamic element MUST have:

```javascript
{
  parameterizable: true,
  parameterId: "unique_id",  // Unique across template, lowercase with underscores
  parameterType: "text" | "imageUrl" | "videoUrl"
}
```

#### Naming Conventions

| Element Type | parameterId Examples                        | parameterType |
| ------------ | ------------------------------------------- | ------------- |
| Text         | `headline`, `subtitle`, `cta_text`, `price` | `"text"`      |
| Image        | `product_image`, `logo`, `background_image` | `"imageUrl"`  |
| Video        | `hero_video`, `background_video`            | `"videoUrl"`  |

#### Best Practices

1. **Use descriptive IDs:** `product_title` not `text1`
2. **Be consistent:** Use snake_case across all templates
3. **Unique per template:** No duplicate parameterIds on same page
4. **Group logically:** Related elements share naming prefix (e.g., `card_title`, `card_image`)

#### Validation Checklist

Before finalizing any template update:

- [ ] All text elements have `parameterizable: true` and unique `parameterId`
- [ ] All image elements have `parameterizable: true` and unique `parameterId`
- [ ] All video elements have `parameterizable: true` and unique `parameterId`
- [ ] No duplicate parameterIds exist on the same page
- [ ] parameterIds are descriptive and follow snake_case convention

### Design Best Practices

#### Typography Guidelines

- **Font limit:** Use 2-3 fonts maximum per template
- **Hierarchy:** Headings should be 1.5-2x larger than body text
- **Minimum size:** 24px for social media readability
- **Weights:** Headings 600-900 (bold), Body 400-500 (regular)

**Popular font pairings:**

- `Prata` + `Inter`
- `Instrument Serif` + `DM Sans`
- `Playfair Display` + `Lato`
- `Montserrat` + `Open Sans`

**Platform-specific fonts:**

- iOS: `SF Pro Display`, `SF Pro Text`
- Android: `Google Sans`, `Roboto`

#### Color Guidelines

**Luxury/Gold palette:**

- Gold: `#D4AF37`
- Dark gold: `#B8860B`
- Light gold: `#F5E7A3`

**iOS system colors:**

- Blue: `#007AFF`
- Gray: `#8E8E93`
- Background: `#F5F5F7`

**Professional dark:**

- Navy: `#0F172A`
- Slate: `#1E293B`, `#334155`
- Muted: `#64748B`, `#94A3B8`

**Best practices:**

- Ensure 4.5:1 minimum contrast for text readability
- Use gradients sparingly for premium effects
- Consistent color palette (3-5 colors max)

#### Layout Guidelines

- **Edge padding:** 40-60px from canvas edges
- **Element spacing:** 20-40px between elements
- **Alignment:** Center for formal, left for modern
- **Visual flow:** Guide eye with size, color, position

**zIndex ordering:**

- Background images/colors: 1
- Overlay shapes: 2-3
- Text elements: 4-6
- Interactive elements: 7+

#### Common Operations (Design Automation)

**Add text element:**

```javascript
addElement("text", {
  content: "Hello World",
  fontFamily: "Inter",
  fontSize: 48,
  fontWeight: "700",
  color: "#FFFFFF",
  x: 100,
  y: 100,
  width: 400,
  height: 60
});
```

**Add shape backdrop:**

```javascript
addElement("rectangle", {
  fill: "rgba(0,0,0,0.5)",
  width: 1080,
  height: 200,
  x: 0,
  y: 800,
  borderRadius: "0px"
});
```

**Batch update multiple elements:**

```javascript
batchUpdate([
  {
    elementId: "heading",
    type: "ORSHOT_UPDATE_ELEMENT",
    updates: { style: { fontSize: 72 } }
  },
  {
    elementId: "subtitle",
    type: "ORSHOT_UPDATE_ELEMENT",
    updates: { style: { color: "#94A3B8" } }
  },
  { type: "ORSHOT_UPDATE_CANVAS", updates: { backgroundColor: "#0F172A" } }
]);
```

## API Reference

### 1. Render from Studio Template

Generate images/PDFs/videos from templates designed in Orshot Studio.

**POST** `https://api.orshot.com/v1/studio/render`

```js
await fetch("https://api.orshot.com/v1/studio/render", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer <ORSHOT_API_KEY>"
  },
  body: JSON.stringify({
    templateId: 123, // Integer - your studio template ID
    modifications: {
      title: "Hello World",
      imageUrl: "https://example.com/photo.jpg",
      canvasBackgroundColor: "#eff2fa"
    },
    response: {
      type: "base64", // "base64" | "url" | "binary"
      format: "png", // "png" | "webp" | "jpg" | "pdf" | "mp4" | "webm" | "gif"
      scale: 1, // 1 = original size, 2 = double
      includePages: [1, 3], // optional – only for multi-page templates
      fileName: "my-render" // optional – custom filename (without extension)
    },
    pdfOptions: {
      // optional – only when format is "pdf"
      margin: "20px",
      rangeFrom: 1,
      rangeTo: 2,
      colorMode: "rgb", // "rgb" or "cmyk"
      dpi: 300
    }
  })
});
```

**Response (single page):**

```json
{
  "data": {
    "content": "data:image/png;base64,iVBORw0.....",
    "format": "png",
    "type": "base64",
    "responseTime": 325.22
  }
}
```

**Response (multi-page/carousel):**

```json
{
  "data": [
    { "page": 1, "content": "https://storage.orshot.com/.../image1.png" },
    { "page": 2, "content": "https://storage.orshot.com/.../image2.png" }
  ],
  "format": "png",
  "type": "url",
  "responseTime": 3166.01,
  "totalPages": 2,
  "renderedPages": 2
}
```

### 2. Render from Utility Template

Generate renders from Orshot's pre-built utility templates (e.g., website screenshots, tweet images).

**POST** `https://api.orshot.com/v1/generate/{renderType}`

- `renderType`: `images` or `pdfs`

```js
await fetch("https://api.orshot.com/v1/generate/images", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer <ORSHOT_API_KEY>"
  },
  body: JSON.stringify({
    templateId: "website-screenshot", // String ID for utility templates
    response: {
      format: "png",
      type: "base64"
    },
    modifications: {
      websiteUrl: "https://example.com",
      fullCapture: false,
      delay: 500,
      width: 1200,
      height: 1000
    }
  })
});
```

### 3. Generate Signed URL

Create publicly accessible render URLs without exposing your API key.

**POST** `https://api.orshot.com/v1/signed-url/create`

```js
await fetch("https://api.orshot.com/v1/signed-url/create", {
  method: "POST",
  headers: {
    Authorization: "Bearer <ORSHOT_API_KEY>",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    templateId: "website-screenshot",
    expiresAt: 1744550160505, // UNIX timestamp, or null for no expiry
    renderType: "images",
    modifications: {
      websiteUrl: "https://example.com"
    }
  })
});
```

### 4. List Studio Templates

**GET** `https://api.orshot.com/v1/studio/templates/all?page=1&limit=10`

Response includes `data` array of templates and `pagination` object with `page`, `limit`, `total`, `totalPages`.

### 5. Get Studio Template

**GET** `https://api.orshot.com/v1/studio/templates/:templateId`

Returns the template metadata including available `modifications`.

### 6. Delete Studio Template

**DELETE** `https://api.orshot.com/v1/studio/templates/:templateId`

### 7. Duplicate Studio Template

**POST** `https://api.orshot.com/v1/studio/templates/:templateId/duplicate`

### 8. Get Workspace Profile

**GET** `https://api.orshot.com/v1/profile/workspace`

Returns workspace details, plan info, and render usage.

### 9. Brand Assets API

#### Upload Brand Asset

**POST** `https://api.orshot.com/v1/brand-assets/upload`
Upload as `multipart/form-data` with a `file` field. Max 5MB, supports PNG, JPG, JPEG, SVG, WEBP, GIF.

#### Get Brand Assets

**GET** `https://api.orshot.com/v1/brand-assets`

#### Delete Brand Asset

**DELETE** `https://api.orshot.com/v1/brand-assets/:assetId`

### 10. Enterprise API Endpoints

These endpoints require an Enterprise plan.

#### Create Studio Template

**POST** `https://api.orshot.com/v1/studio/templates/create`

```js
{
  name: "Product Banner",        // required, max 255 chars
  description: "Banner template", // optional
  canvas_width: 1200,             // required, 1-5000
  canvas_height: 628,             // required, 1-5000
  pages_data: [...]               // optional - array of page objects with elements
}
```

#### Bulk Create Studio Templates

**POST** `https://api.orshot.com/v1/studio/templates/bulk-create`
Create multiple templates at once via CSV or JSON.

#### Update Template

**PATCH** `https://api.orshot.com/v1/studio/templates/:templateId`
Update template name and description.

#### Update Template Modifications

**PATCH** `https://api.orshot.com/v1/studio/templates/:templateId/update-modifications`
Update text and image content in template layers.

#### Generate Template Variants

**POST** `https://api.orshot.com/v1/studio/templates/:templateId/generate-variants`
Generate multiple size variants of a template using AI.

### 11. Dynamic URLs

Generate images directly from URL parameters:

```
https://api.orshot.com/v1/studio/dynamic-url/my-image?title=Hello%20World&title.fontSize=48px&title.color=%23ff0000
```

URL-encode special characters (e.g., `#` → `%23`).

## Render Configuration

### Dynamic Parameters

Override template styles, content, and behavior at render time using dot notation.

#### Style Parameters

Format: `parameterId.property`

```json
{
  "modifications": {
    "title": "Hello World",
    "title.fontSize": "48px",
    "title.color": "#ff0000",
    "title.fontFamily": "Roboto",
    "title.textAlign": "center",
    "logo.borderRadius": "50%",
    "logo.objectFit": "cover"
  }
}
```

**Text properties:** `fontSize`, `fontWeight`, `fontStyle`, `fontFamily`, `lineHeight`, `letterSpacing`, `textAlign`, `verticalAlign`, `textDecoration`, `textTransform`, `color`, `backgroundColor`, `backgroundRadius`, `textStrokeWidth`, `textStrokeColor`, `opacity`, `filter`, `dropShadowX/Y/Blur/Color`

**Image properties:** `objectFit`, `objectPosition`, `borderRadius`, `borderWidth`, `borderColor`, `boxShadowX/Y/Blur/Color`, `opacity`, `filter`

**Shape properties:** `fill`, `stroke`, `strokeWidth`, `borderRadius`, `opacity`

**Position/Size (all elements):** `x`, `y`, `width`, `height`

Property names are **case-insensitive**.

#### Multi-Page Templates

Prefix modifications with page number:

```json
{
  "modifications": {
    "page1@title": "Page 1 Title",
    "page2@title": "Page 2 Title",
    "page1@title.fontSize": "48px"
  }
}
```

#### AI Content Generation (.prompt)

Generate text or images using AI:

```json
{
  "modifications": {
    "headline.prompt": "Write a catchy headline about coffee",
    "background.prompt": "A serene mountain landscape at sunset"
  }
}
```

- Text elements use `openai/gpt-5-nano`
- Image elements use `google/nano-banana`

#### Interactive Links (.href)

Add clickable links in PDF outputs:

```json
{
  "modifications": {
    "cta_button.href": "https://example.com/signup",
    "logo.href": "https://company.com"
  },
  "response": { "format": "pdf" }
}
```

#### Video Parameters

Control video elements dynamically:

```json
{
  "modifications": {
    "bgVideo": "https://example.com/video.mp4",
    "bgVideo.trimStart": 5,
    "bgVideo.trimEnd": 15,
    "bgVideo.muted": false,
    "bgVideo.loop": true
  },
  "response": { "format": "mp4" }
}
```

### Video Render Example

Render templates with video elements as MP4, WebM, or GIF:

```js
await fetch("https://api.orshot.com/v1/studio/render", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer <ORSHOT_API_KEY>"
  },
  body: JSON.stringify({
    templateId: 123,
    modifications: {
      videoElement: "https://example.com/custom-video.mp4",
      "videoElement.trimStart": 0,
      "videoElement.trimEnd": 10,
      "videoElement.muted": false,
      "videoElement.loop": true
    },
    videoOptions: {
      trimStart: 0,
      trimEnd: 20,
      muted: true,
      loop: true
    },
    response: {
      type: "url",
      format: "mp4"
    }
  })
});
```

### Response Types

| Type     | Description                                     |
| -------- | ----------------------------------------------- |
| `url`    | Returns a hosted URL to the rendered file       |
| `base64` | Returns base64-encoded content as a string      |
| `binary` | Returns binary file content for custom handling |

### Response Formats

| Format | Type  | Notes                                      |
| ------ | ----- | ------------------------------------------ |
| `png`  | Image | Best quality, larger size                  |
| `webp` | Image | Smaller size, good quality                 |
| `jpg`  | Image | Compressed, no transparency                |
| `pdf`  | Doc   | Supports multi-page, clickable links, CMYK |
| `mp4`  | Video | H.264, requires video elements in template |
| `webm` | Video | VP9, web-optimized                         |
| `gif`  | Video | Animated, no audio support                 |

### Render Usage & Costs

| Output               | Cost                 |
| -------------------- | -------------------- |
| Image (PNG/JPG/WebP) | 2 renders per image  |
| PDF                  | 2 renders per page   |
| Video (MP4/WebM/GIF) | 2 renders per second |

Multi-page templates: each page counts separately.

## Integrations & Helps

### Integrations Service Support

Orshot connects with:

- **No-code:** Zapier, Make (Integromat), n8n, Pipedream, Airtable
- **Storage:** Amazon S3, Cloudflare R2, Google Drive, Dropbox
- **Notifications:** Slack, Webhooks
- **Design:** Figma Plugin, Canva Import, Polotno Import
- **CLI:** `npx orshot-cli` for terminal-based generation
- **MCP Server:** Use with Claude, Cursor, Windsurf via MCP protocol
- **Embed:** White-label design editor for your app (React SDK, Vue SDK, iframe)

### Common Error Codes

| Code | Error                          | Fix                                          |
| ---- | ------------------------------ | -------------------------------------------- |
| 400  | `templateId missing`           | Add `templateId` to request body             |
| 400  | `Invalid API Key`              | Generate new key from dashboard              |
| 403  | `Authorization header missing` | Add `Authorization: Bearer <KEY>` header     |
| 403  | `Subscription inactive`        | Check usage or upgrade plan                  |
| 403  | `Template not found`           | Verify template ID belongs to your workspace |
| 403  | `Video on free plan`           | Upgrade to paid plan for video generation    |

### General Best Practices

1. **Use `url` response type** for production – avoids large base64 payloads
2. **Use `webp` format** for smaller file sizes with good quality
3. **Test in Playground** before coding – each template has an interactive playground
4. **Use style parameters** instead of creating multiple template variants
5. **Use consistent units** – stick to `px` for sizes
6. **Multi-page prefix** – always use `page1@paramId` format for carousel templates
7. **Cache renders** – use `?cache=false` query param to bypass cache when needed
8. **Handle errors** – check for 403/400 status codes and parse error messages

### Links

- Documentation: https://orshot.com/docs
- API Reference: https://orshot.com/docs/api-reference
- Integrations: https://orshot.com/integrations
- MCP Server: https://orshot.com/docs/integrations/mcp-server
- Templates: https://orshot.com/templates
- Pricing: https://orshot.com/pricing
