export type ListingStage =
  | "upload"
  | "plan"
  | "review"
  | "complete"
  | "generate";

export type ListingStageStep = {
  label: string;
  sublabel?: string;
  active?: boolean;
  completed?: boolean;
};
