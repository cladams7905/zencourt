import {
  ROOM_CATEGORIES,
  type RoomCategory,
  type RoomClassification
} from "@web/src/lib/domain/listing/roomCategories";
import { AIVisionError } from "./errors";

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

    const primaryScore =
      typeof parsed.primary_score === "number"
        ? parsed.primary_score
        : typeof parsed.primaryScore === "number"
          ? parsed.primaryScore
          : undefined;

    const perspective =
      parsed.perspective === "aerial" || parsed.perspective === "ground"
        ? parsed.perspective
        : undefined;

    return {
      category: parsed.category as RoomCategory,
      confidence: parseFloat(parsed.confidence),
      primaryScore,
      perspective
    };
  } catch (error) {
    throw new AIVisionError(
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
    throw new AIVisionError(
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
    throw new AIVisionError(
      `Invalid confidence value: ${classification.confidence}`,
      "INVALID_RESPONSE",
      classification
    );
  }

  if (
    classification.primaryScore !== undefined &&
    (typeof classification.primaryScore !== "number" ||
      classification.primaryScore < 0 ||
      classification.primaryScore > 1)
  ) {
    throw new AIVisionError(
      `Invalid primary_score value: ${classification.primaryScore}`,
      "INVALID_RESPONSE",
      classification
    );
  }
}
