export type ImagePerspective = "aerial" | "ground";

export type CameraMotionVariantId =
  | "default"
  | "pan"
  | "tracking"
  | "orbital"
  | "blur-to-focus";

export type VideoSceneSelection = {
  selected: boolean;
  motionVariantId: CameraMotionVariantId;
};

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
  videoScene?: VideoSceneSelection;
  analysisVersion?: string;
  scoreBreakdown?: ListingImageScoreBreakdown;
  featureTags?: string[];
  detailType?: string;
  detailSubject?: string;
  analysisError?: string | null;
};
