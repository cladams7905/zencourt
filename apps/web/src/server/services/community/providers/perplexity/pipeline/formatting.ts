import type { CategoryKey, CommunityPlaceItem } from "@web/src/server/services/community/config";
const FIELD_SEPARATOR = " | ";

function formatLabel(label: string, value: string): string {
  return `${label}: ${value}`;
}

function formatPlaceLine(
  category: CategoryKey,
  item: CommunityPlaceItem,
  audienceLabel?: string
): string {
  const parts: string[] = [];

  if (item.location) {
    parts.push(formatLabel("Location", item.location));
  }
  if (item.drive_distance_minutes !== undefined) {
    parts.push(formatLabel("Est. drive time", `${item.drive_distance_minutes} min`));
  }
  if (item.cost) {
    parts.push(formatLabel("Cost", item.cost));
  }
  if (category === "community_events" && item.dates) {
    parts.push(formatLabel("Dates", item.dates));
  }
  if ((category === "dining" || category === "coffee_brunch") && item.cuisine) {
    parts.push(formatLabel("Cuisine", item.cuisine.join(", ")));
  }
  if (item.why_suitable_for_audience) {
    const label = audienceLabel
      ? `Why suitable for ${audienceLabel}`
      : "Why suitable";
    parts.push(formatLabel(label, item.why_suitable_for_audience));
  }
  if (item.description) {
    parts.push(formatLabel("Description", item.description));
  }
  if (category === "nature_outdoors" && item.disclaimer) {
    parts.push(formatLabel("Disclaimer", item.disclaimer));
  }

  const details = parts.length > 0 ? ` — ${parts.join(FIELD_SEPARATOR)}` : "";
  return `- ${item.name}${details}`;
}

export function formatPerplexityCategoryList(
  category: CategoryKey,
  items: CommunityPlaceItem[],
  audienceLabel?: string
): string {
  if (!items || items.length === 0) {
    return "- (none found)";
  }

  const lines = items.map((item) =>
    formatPlaceLine(category, item, audienceLabel)
  );
  return lines.join("\n");
}
