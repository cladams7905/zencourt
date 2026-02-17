export type ListingTimelineStage = "categorize" | "review" | "create" | "generate";

export type ListingTimelineStep = {
  label: string;
  active?: boolean;
  completed?: boolean;
};
