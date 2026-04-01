import { ROOM_CATEGORIES } from "@web/src/lib/domain/listings/image/roomCategories";

const CATEGORY_PROMPT_LINES = Object.values(ROOM_CATEGORIES)
  .sort((a, b) => a.order - b.order)
  .map((category) => `- ${category.id}: ${category.label}`)
  .join("\n");

export const CLASSIFICATION_PROMPT = `You are an expert real estate image classifier. Analyze this property image and classify the room type.

IMPORTANT CLASSIFICATION RULES:
1. Choose the MOST SPECIFIC category that fits the image
2. Use "master-bedroom" only when the image clearly shows the primary/master suite; use "bedroom" for all other bedrooms
3. If the image is a decorative or feature shot within a room, still assign the best room category when the room is clear, but set shot_type to "detail"
4. If the image does NOT fit any category, is uncertain/undetermined, or you cannot analyze it, use category "other" and shot_type "other"
5. Consider the primary purpose of the space shown
6. Look for distinctive features (appliances, furniture, fixtures, decor)
7. Never guess a room type from low-quality, irrelevant, or non-room images; use "other" instead
8. If your response would include an apology, refusal, or "cannot analyze", the category MUST be "other"

SHOT_TYPE RULES:
- "room": a normal room-wide or room-representative image
- "detail": a close-up or feature-focused image that may still belong to a room
- "other": irrelevant, unusable, non-property, screenshot, collage, document, or indeterminate image

SCORING RUBRIC (0-1):
- lighting: brightness, exposure balance, natural/pleasant light
- framing: composition, horizon/levelness, camera angle, visual balance
- coverage: how well the image shows key visual information
- clarity: sharpness, blur, noise, compression, obstructions
- motion_potential: how suitable the scene is as a source for subtle camera movement in video
- room_representativeness: for shot_type "room", how strongly the image represents the room
- feature_appeal: for shot_type "detail", how visually compelling the feature shot is

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
  "shot_type": "<room|detail|other>",
  "feature_tags": ["<zero or more short tags>"],
  "scores": {
    "lighting": <number between 0 and 1>,
    "framing": <number between 0 and 1>,
    "coverage": <number between 0 and 1>,
    "clarity": <number between 0 and 1>,
    "motion_potential": <number between 0 and 1>,
    "room_representativeness": <number between 0 and 1 or null>,
    "feature_appeal": <number between 0 and 1 or null>
  },
  "perspective": "<aerial|ground|none>"
}

EXAMPLES:
{
  "category": "kitchen",
  "confidence": 0.95,
  "shot_type": "room",
  "feature_tags": ["island", "natural-light"],
  "scores": {
    "lighting": 0.9,
    "framing": 0.88,
    "coverage": 0.93,
    "clarity": 0.9,
    "motion_potential": 0.8,
    "room_representativeness": 0.94,
    "feature_appeal": null
  },
  "perspective": "none"
}

{
  "category": "exterior-front",
  "confidence": 0.92,
  "shot_type": "room",
  "feature_tags": ["curb-appeal"],
  "scores": {
    "lighting": 0.85,
    "framing": 0.9,
    "coverage": 0.9,
    "clarity": 0.87,
    "motion_potential": 0.84,
    "room_representativeness": 0.91,
    "feature_appeal": null
  },
  "perspective": "aerial"
}

Now analyze the provided image and respond with the classification JSON:`;

export const CLASSIFICATION_PROMPT_VERSION = "2026-04-01.1";
