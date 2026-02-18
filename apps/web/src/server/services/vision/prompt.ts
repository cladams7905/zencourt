import { ROOM_CATEGORIES } from "@web/src/lib/domain/listing/vision";

const CATEGORY_PROMPT_LINES = Object.values(ROOM_CATEGORIES)
  .sort((a, b) => a.order - b.order)
  .map((category) => `- ${category.id}: ${category.label}`)
  .join("\n");

export const CLASSIFICATION_PROMPT = `You are an expert real estate image classifier. Analyze this property image and classify the room type.

IMPORTANT CLASSIFICATION RULES:
1. Choose the MOST SPECIFIC category that fits the image
2. If the image does NOT fit any category, is uncertain/undetermined, or you cannot analyze it, use "other"
3. Consider the primary purpose of the space shown
4. Look for distinctive features (appliances, furniture, fixtures)
5. Never guess a room type from low-quality, irrelevant, or non-room images-use "other" instead
6. If your response would include an apology, refusal, or "cannot analyze", the category MUST be "other"
7. Provide a "primary_score" from 0 to 1 estimating how strong a PRIMARY/hero image this would be for its room category.

PRIMARY_SCORE RUBRIC (0-1):
- Lighting: well-lit, natural light preferred, minimal shadows/overexposure
- Perspective: wide, level, shows layout and depth
- Coverage: clearly represents the room's key features
- Clarity: sharp, not blurry, minimal obstructions/clutter
- Composition: centered/balanced framing suitable as a thumbnail

PERSPECTIVE CLASSIFICATION:
For exterior images ONLY (exterior-front, exterior-backyard), classify the camera perspective:
- "aerial": taken from above (elevated vantage point, bird's-eye view, looking down at the property)
- "ground": taken from ground level (street view, eye-level, standing perspective)
For all interior and non-exterior categories, always use "none".

AVAILABLE CATEGORIES:
${CATEGORY_PROMPT_LINES}

RESPONSE FORMAT:
You must respond with ONLY a valid JSON object, no additional text. Use this exact structure:
{
  "category": "<one of the categories above>",
  "confidence": <number between 0 and 1>,
  "primary_score": <number between 0 and 1>,
  "perspective": "<aerial|ground|none>"
}

EXAMPLES:
{
  "category": "kitchen",
  "confidence": 0.95,
  "primary_score": 0.88,
  "perspective": "none"
}

{
  "category": "exterior-front",
  "confidence": 0.92,
  "primary_score": 0.85,
  "perspective": "aerial"
}

Now analyze the provided image and respond with the classification JSON:`;

export const CLASSIFICATION_PROMPT_VERSION = "2026-02-18.1";
