Image output requirements:

- Use either `single-image` or `carousel` format.
- Prefer single-image when it communicates the message clearly.
- If carousel, max 5 slides.
- For carousel posts, each slide in `body` must include:
  - `header` with a clear, skimmable title.
  - `content` with 1-2 short sentences.
  - `broll_query` that is broad/simple (2-5 words).
  - `text_overlay` object aligned to the image overlay template section.
- For `text_overlay` strings (headline/accent lines), optional inline italics may be used as `*word*` or `*short phrase*`.
- For single-image posts, set `body` to `null`.
