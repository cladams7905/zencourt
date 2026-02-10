export const PRIORITY_CATEGORIES = [
  "exterior-front",
  "exterior-backyard",
  "living-room",
  "kitchen"
] as const;

export const DEFAULT_PRIORITY_DURATION_SECONDS = 3;
export const DEFAULT_STANDARD_DURATION_SECONDS = 2;

const PRIORITY_CATEGORY_SET = new Set<string>(PRIORITY_CATEGORIES);

export function normalizeRoomCategory(category: string): string {
  return category.replace(/-\d+$/, "");
}

export function isPriorityCategory(category: string): boolean {
  return PRIORITY_CATEGORY_SET.has(normalizeRoomCategory(category));
}

export function getDurationSecondsForCategory(category: string): number {
  return isPriorityCategory(category)
    ? DEFAULT_PRIORITY_DURATION_SECONDS
    : DEFAULT_STANDARD_DURATION_SECONDS;
}
