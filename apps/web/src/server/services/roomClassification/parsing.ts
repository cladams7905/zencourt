import {
  ROOM_CATEGORIES,
  type RoomCategory,
  type RoomClassification
} from "@web/src/lib/domain/listings/image/roomCategories";
import { RoomClassificationError } from "./errors";

const VALID_CATEGORIES = Object.keys(ROOM_CATEGORIES) as RoomCategory[];

export function parseClassificationResponse(
  content: string
): RoomClassification {
  try {
    let jsonContent = content.trim();
    const codeBlockMatch = jsonContent.match(
      /```(?:json)?\s*(\{[\s\S]*\})\s*```/
    );

    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1];
    }

    const parsed = JSON.parse(jsonContent);

    const perspective =
      parsed.perspective === "aerial" || parsed.perspective === "ground"
        ? parsed.perspective
        : undefined;

    const scores = parsed.scores ?? {};

    return {
      category: parsed.category as RoomCategory,
      confidence: parseFloat(parsed.confidence),
      shotType: parsed.shot_type,
      featureTags: Array.isArray(parsed.feature_tags)
        ? parsed.feature_tags.filter(
            (value: unknown): value is string => typeof value === "string"
          )
        : [],
      scores: {
        lighting: parseFloat(scores.lighting),
        framing: parseFloat(scores.framing),
        coverage: parseFloat(scores.coverage),
        clarity: parseFloat(scores.clarity),
        motionPotential: parseFloat(scores.motion_potential),
        roomRepresentativeness:
          typeof scores.room_representativeness === "number"
            ? scores.room_representativeness
            : undefined,
        featureAppeal:
          typeof scores.feature_appeal === "number"
            ? scores.feature_appeal
            : undefined
      },
      perspective
    };
  } catch (error) {
    throw new RoomClassificationError(
      "Failed to parse AI response as JSON",
      "INVALID_RESPONSE",
      {
        content,
        error
      }
    );
  }
}

export function validateClassification(
  classification: RoomClassification
): void {
  if (!VALID_CATEGORIES.includes(classification.category)) {
    throw new RoomClassificationError(
      `Invalid room category: ${classification.category}`,
      "INVALID_RESPONSE",
      classification
    );
  }

  if (
    typeof classification.confidence !== "number" ||
    classification.confidence < 0 ||
    classification.confidence > 1
  ) {
    throw new RoomClassificationError(
      `Invalid confidence value: ${classification.confidence}`,
      "INVALID_RESPONSE",
      classification
    );
  }

  if (
    classification.shotType !== "room" &&
    classification.shotType !== "detail" &&
    classification.shotType !== "other"
  ) {
    throw new RoomClassificationError(
      `Invalid shot_type value: ${classification.shotType}`,
      "INVALID_RESPONSE",
      classification
    );
  }

  for (const [key, value] of Object.entries(classification.scores)) {
    if (value === undefined) {
      continue;
    }
    if (typeof value !== "number" || value < 0 || value > 1) {
      throw new RoomClassificationError(
        `Invalid score value for ${key}: ${value}`,
        "INVALID_RESPONSE",
        classification
      );
    }
  }
}
