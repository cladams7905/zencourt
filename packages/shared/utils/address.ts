/**
 * Returns the first comma-separated segment of a formatted address (typically
 * the street line). Matches the common "street, city, region" pattern used by
 * Google-style formatted addresses.
 */
export function listingStreetLineFromAddress(
  address: string | null | undefined
): string {
  const normalized = address?.trim() ?? "";
  if (!normalized) {
    return "";
  }
  const parts = normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts[0] ?? "";
}
