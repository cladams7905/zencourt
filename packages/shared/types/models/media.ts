export type ImagePerspective = "aerial" | "ground";

export type ListingImageShotType = "room" | "detail" | "other";

export type ListingImageAnalysisStatus =
  | "pending"
  | "processing"
  | "complete"
  | "failed";

export type ListingImageAiScores = {
  lighting: number;
  framing: number;
  coverage: number;
  clarity: number;
  motionPotential: number;
  roomRepresentativeness?: number;
  featureAppeal?: number;
};

export type ListingImageScoreBreakdown = ListingImageAiScores & {
  resolution: number;
  aspectRatio: number;
  technical: number;
  composition: number;
  storytelling: number;
  total: number;
};

export type ImageMetadata = {
  width: number;
  height: number;
  format: string;
  size: number;
  lastModified: number;
  perspective?: ImagePerspective;
  analysisVersion?: string;
  scoreBreakdown?: ListingImageScoreBreakdown;
  featureTags?: string[];
  detailType?: string;
  detailSubject?: string;
  analysisError?: string | null;
};
