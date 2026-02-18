import type { MarketLocation } from "../types";
import { NOT_AVAILABLE } from "./transforms";

export function buildSummary(
  location: MarketLocation,
  medianPrice: string,
  priceChange: string,
  inventory: string,
  monthsSupply: string
): { summary: string } {
  const summaryParts: string[] = [];

  if (medianPrice !== NOT_AVAILABLE && priceChange !== NOT_AVAILABLE) {
    summaryParts.push(
      `${location.city} home prices are around ${medianPrice}, with ${priceChange} year-over-year movement.`
    );
  } else {
    summaryParts.push(`Market snapshot for ${location.city}, ${location.state}.`);
  }

  if (inventory !== NOT_AVAILABLE && monthsSupply !== NOT_AVAILABLE) {
    summaryParts.push(
      `Inventory sits near ${monthsSupply} months with about ${inventory} active listings.`
    );
  }

  return { summary: summaryParts.join(" ") };
}
