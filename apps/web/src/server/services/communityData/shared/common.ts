import { createHash } from "node:crypto";
import type { CategoryKey } from "@web/src/server/services/_config/community";

export const UTC_MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
] as const;

export type UtcMonthKey = (typeof UTC_MONTH_KEYS)[number];

export const ALL_CATEGORY_KEYS: CategoryKey[] = [
  "neighborhoods",
  "dining",
  "coffee_brunch",
  "nature_outdoors",
  "entertainment",
  "attractions",
  "sports_rec",
  "arts_culture",
  "nightlife_social",
  "fitness_wellness",
  "shopping",
  "education",
  "community_events"
];

export function getUtcMonthKey(date = new Date()): UtcMonthKey {
  return UTC_MONTH_KEYS[date.getUTCMonth()] ?? "january";
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildServiceAreasSignature(
  serviceAreas?: string[] | null
): string | null {
  if (!serviceAreas || serviceAreas.length === 0) {
    return null;
  }

  const normalized = serviceAreas
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (normalized.length === 0) {
    return null;
  }

  normalized.sort();
  const joined = normalized.join("|");
  return createHash("sha1").update(joined).digest("hex").slice(0, 12);
}

export function getSecondsUntilEndOfMonth(now = new Date()): number {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const nextMonthStart = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));
  const diffMs = nextMonthStart.getTime() - now.getTime();
  return Math.max(60, Math.ceil(diffMs / 1000));
}
