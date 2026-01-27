Content output requirements:

- Provide a short hook.
- Use either single-image or carousel format.
- For carousels, each slide should have a clear header and 1-2 sentences of content.
- Use a concise CTA when needed.
- Captions must be readable with line breaks and avoid excessive length.
- Include a `broll_query` field for each post. Keep it broad and simple (2-5 words), not overly specific. Just capture the general background scene that would make sense for this post.
- If the post is a carousel, each slide in `body` must include its own `broll_query` with the same broad/simple guidance.

Output constraints:

- Return a JSON array of exactly 4 items.
- Prefer single-image posts when possible.
- Add new lines between every 1-2 sentences to make it easier to read.
- Hooks should always be between 3-10 words.
- If carousel, max 5 slides.
- Captions must be concise and vary in length. Use this mix: 2 short (1-3 sentences), 1 medium (4-6 sentences), 1 long (7-10 sentences).
- Captions must not exceed ~700 characters.
- Writing style must match the writing style description and tone level. If a template conflicts with the required tone, rephrase it in the same structure and length.
- Hooks must be based on the hook templates below. Do not invent a hook style that isn't clearly derived from the list.
- Avoid engagement bait or false urgency.
