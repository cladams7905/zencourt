import type {
  ImageMetadata,
  ListingImageAiScores,
  ListingImageScoreBreakdown,
  ListingImageShotType
} from "@shared/types/models";

const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 720;
const TARGET_ASPECT_RATIO = TARGET_WIDTH / TARGET_HEIGHT;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function roundScore(value: number): number {
  return Number(clamp01(value).toFixed(4));
}

export function calculateResolutionScore(metadata?: ImageMetadata | null): number {
  const width = metadata?.width ?? 0;
  const height = metadata?.height ?? 0;
  if (width <= 0 || height <= 0) {
    return 0;
  }

  const widthRatio = width / TARGET_WIDTH;
  const heightRatio = height / TARGET_HEIGHT;
  const minRatio = Math.min(widthRatio, heightRatio);

  if (minRatio >= 1) {
    return 1;
  }
  if (minRatio <= 0.5) {
    return roundScore(minRatio * 0.5);
  }
  return roundScore(minRatio);
}

export function calculateAspectRatioScore(
  metadata?: ImageMetadata | null
): number {
  const width = metadata?.width ?? 0;
  const height = metadata?.height ?? 0;
  if (width <= 0 || height <= 0) {
    return 0;
  }

  const aspectRatio = width / height;
  const difference = Math.abs(aspectRatio - TARGET_ASPECT_RATIO);
  return roundScore(1 - Math.min(difference / TARGET_ASPECT_RATIO, 1));
}

function averageScores(scores: number[]): number {
  if (scores.length === 0) {
    return 0;
  }
  return roundScore(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

export function calculateRecommendationBreakdown(args: {
  metadata?: ImageMetadata | null;
  scores: ListingImageAiScores;
  shotType: ListingImageShotType;
  confidence: number;
}): ListingImageScoreBreakdown {
  const { metadata, scores, shotType, confidence } = args;
  const resolution = calculateResolutionScore(metadata);
  const aspectRatio = calculateAspectRatioScore(metadata);
  const technical = averageScores([resolution, aspectRatio]);
  const composition = averageScores([
    scores.lighting,
    scores.framing,
    scores.coverage,
    scores.clarity
  ]);
  const storytellingInputs =
    shotType === "detail"
      ? [scores.motionPotential, scores.featureAppeal ?? 0, confidence]
      : [scores.motionPotential, scores.roomRepresentativeness ?? 0, confidence];
  const storytelling = averageScores(storytellingInputs);
  const total = roundScore(
    technical * 0.25 + composition * 0.45 + storytelling * 0.3
  );

  return {
    ...scores,
    resolution,
    aspectRatio,
    technical,
    composition,
    storytelling,
    total
  };
}
