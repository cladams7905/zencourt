export type ListingStage = "categorize" | "review" | "create" | "generate";

export type ListingStageStep = {
  label: string;
  active?: boolean;
  completed?: boolean;
};
