export type VideoResolution = {
  width: number;
  height: number;
};

export type VideoOrientation = "landscape" | "vertical";

export type VideoMetadata = {
  duration?: number;
  resolution?: VideoResolution;
  orientation?: VideoOrientation;
  fileSize?: number;
  checksumSha256?: string;
};

export type ClipVersionMetadata = VideoMetadata & {
  versionLabel?: string;
};

export type GENERATION_MODELS =
  | "veo3.1_fast"
  | "runway-gen4-turbo"
  | "kling1.6";

export type JobGenerationSettings = {
  model: GENERATION_MODELS;
  orientation: VideoOrientation;
  aiDirections: string;
  imageUrls: string[];
  prompt: string;
  category: string;
  sortOrder: number;
  roomId?: string;
  roomName?: string;
  roomNumber?: number;
  clipIndex?: number;
};

export type ClipVersionRecord = {
  id: string;
  clipId: string;
  listingId: string;
  roomId?: string | null;
  roomName: string;
  category: string;
  clipIndex: number;
  sortOrder: number;
  versionNumber: number;
  status: "pending" | "processing" | "completed" | "failed" | "canceled";
  isCurrent: boolean;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  metadata?: ClipVersionMetadata | null;
  errorMessage?: string | null;
  orientation: VideoOrientation;
  generationModel: GENERATION_MODELS;
  imageUrls: string[];
  prompt: string;
  aiDirections: string;
  sourceVideoGenJobId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};
