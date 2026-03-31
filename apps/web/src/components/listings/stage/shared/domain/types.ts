export type ListingStage = "categorize" | "review" | "create" | "generate";

export type ListingStageStep = {
  label: string;
  sublabel?: string;
  active?: boolean;
  completed?: boolean;
};
