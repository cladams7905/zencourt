import type { ListingContentSubcategory } from "@shared/types/models";
import type { ContentRequestInput, PromptValues } from "./types";
import { LISTING_SUBCATEGORY_HOOK_FILES } from "./promptFileCache";

export function hasMeaningfulValue(
  value: string | null | undefined
): value is string {
  if (!value) {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  const normalized = trimmed.toLowerCase();
  return normalized !== "n/a" && normalized !== "na" && normalized !== "null";
}

export function cleanSummaryText(value: string): string {
  return value.replace(/—/g, ",").replace(/\s+/g, " ").trim();
}

export function interpolateTemplate(
  template: string,
  values: PromptValues
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    const value = values[key];
    if (value === null || value === undefined) {
      return match;
    }
    return String(value);
  });
}

export function extractSectionText(
  lines: string[],
  heading: string
): string | null {
  const headingIndex = lines.findIndex((line) => line.trim() === heading);
  if (headingIndex === -1) {
    return null;
  }

  const collected: string[] = [];
  for (let i = headingIndex + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) {
      if (collected.length > 0) {
        break;
      }
      continue;
    }
    if (line.startsWith("### ") || line.startsWith("## ")) {
      break;
    }
    if (line.startsWith("<")) {
      break;
    }
    collected.push(line);
  }

  if (collected.length === 0) {
    return null;
  }

  return cleanSummaryText(collected.join(" "));
}

export function extractBulletSection(
  lines: string[],
  marker: string
): string[] {
  const markerIndex = lines.findIndex((line) =>
    line.trim().startsWith(marker)
  );
  if (markerIndex === -1) {
    return [];
  }

  const bullets: string[] = [];
  for (let i = markerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) {
      if (bullets.length > 0) {
        break;
      }
      continue;
    }
    if (!line.startsWith("- ")) {
      break;
    }
    bullets.push(cleanSummaryText(line.slice(2)));
  }

  return bullets;
}

export function resolveContentMediaType(
  contentRequest?: ContentRequestInput | null
): "image" | "video" {
  return contentRequest?.media_type === "video" ? "video" : "image";
}

export function normalizeListingSubcategory(
  subcategory?: string | null
): ListingContentSubcategory | null {
  if (!subcategory) {
    return null;
  }
  return subcategory in LISTING_SUBCATEGORY_HOOK_FILES
    ? (subcategory as ListingContentSubcategory)
    : null;
}
