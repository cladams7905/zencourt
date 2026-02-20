export const PRIORITY_CATEGORIES = [
  "exterior-front",
  "exterior-backyard",
  "living-room",
  "kitchen"
] as const;

export type PriorityCategory = (typeof PRIORITY_CATEGORIES)[number];

export const DEFAULT_PRIORITY_DURATION_SECONDS = 3;
export const DEFAULT_STANDARD_DURATION_SECONDS = 2;
