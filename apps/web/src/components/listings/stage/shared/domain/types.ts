export type ListingStage =
  | "upload"
  | "categorize"
  | "review"
  | "complete"
  | "generate";

export type ListingStageStep = {
  label: string;
  sublabel?: string;
  active?: boolean;
  completed?: boolean;
};
