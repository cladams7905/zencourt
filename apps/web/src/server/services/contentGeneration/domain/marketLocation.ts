import type { MarketLocation } from "@web/src/lib/domain/market/types";

const US_ZIP_REGEX = /\b\d{5}(?:-\d{4})?\b/;

export function parseMarketLocation(
  location: string | null | undefined
): MarketLocation | null {
  if (!location) {
    return null;
  }

  const zipMatch = location.match(US_ZIP_REGEX);
  const zip_code = zipMatch?.[0] ?? "";

  const [cityPart, restPart] = location.split(",");
  const city = cityPart?.trim() ?? "";
  const restTokens = (restPart ?? "").trim().split(/\s+/);
  const state = restTokens[0] ?? "";

  if (!city || !state || !zip_code) {
    return null;
  }

  return { city, state, zip_code };
}
