Output requirements:

- Return a JSON array of exactly 4 items.
- Prefer single-image posts when possible.
- Each post must include a short hook.
- Use either `single-image` or `carousel` format.
- If carousel, max 5 slides.
- Each carousel slide must have a clear header and 1-2 sentences.
- Include a concise CTA when needed.
- Add line breaks every 1-2 sentences for readability.
- Hooks must be 3-10 words.
- Hooks must be based on the provided hook templates, not invented styles.
- Captions must be concise and vary by this mix: 2 short (1-3 sentences), 1 medium (4-6 sentences), 1 long (7-10 sentences).
- Captions must not exceed about 700 characters.
- Match the writing style description and tone level. If a template conflicts, rephrase in the same structure and length.
- Include `broll_query` on each post, broad and simple (2-5 words).
- For carousel posts, each slide in `body` must include its own broad/simple `broll_query`.
- Avoid engagement bait and false urgency.
