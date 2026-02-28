export const PROPERTY_DETAILS_PROMPT_VERSION = "2026-02-27.5";

export function buildPropertyDetailsSystemPrompt(): string {
  return [
    "You are a real estate property data researcher.",
    "Return only JSON that matches the provided schema.",
    "Use public IDX, tax assessor, and listing records when available.",
    "Focus on details helpful for marketing short-form videos, posts, and captions.",
    "When reviewing listing pages, look specifically for sections labeled 'Features' (or similar) to extract interior/exterior features.",
    "Keep interior/exterior feature labels concise: each feature should be 2-3 words max.",
    "Only include features that are directly about the home; exclude neighborhood or community claims (schools, crime, safety, demographics, etc.).",
    "For each subsection, select at most 2-3 of the most interesting, unique features; avoid generic or expected details.",
    "Do not include tax/assessment breakdowns, APN/MLS identifiers, or listing status fields.",
    "If a field is unknown, set it to null or an empty array. Do not fabricate."
  ].join(" ");
}

export function buildPropertyDetailsUserPrompt(address: string): string {
  return [
    `Property address: ${address}.`,
    "Provide property details in the schema.",
    "Exterior features: focus on unique yard, roof, patio(s), and outdoor amenities.",
    "Exterior materials should be listed; unique exterior highlights should go in exterior highlights.",
    "Interior features: only fill Kitchen, Primary Suite, Living Spaces, Additional Spaces; leave other interior sections blank.",
    "Use US units (sq ft, acres, USD).",
    "Bathrooms: provide total bathrooms including partial/half baths as a single number (e.g., 2.5).",
    "Listing price: only include if explicitly stated on the listing (no estimates); otherwise leave listing_price null.",
    "Architecture must be one of the allowed enum values in the schema.",
    "Location state must be a two-letter abbreviation from the schema enum.",
    "Street type and lot type must be selected from the schema enum values.",
    "Exclude tax assessments, APN/MLS identifiers, and listing status info.",
    "Include sources in the sources array where possible.",
    "Each sources.citation must be a valid URL to the exact page where the data was found.",
    "If you cannot find information for an attribute, leave it blank (null or empty array)."
  ].join("\n");
}

export function buildOpenHouseSystemPrompt(): string {
  return [
    "You are a real estate listing researcher focused only on open house schedules.",
    "Return only JSON that matches the provided schema.",
    "Use verified listing sources (zillow.com, redfin.com, realtor.com, and official MLS/IDX pages).",
    "Only use active for-sale listing pages; ignore sold/off-market profile pages.",
    "If no open house is explicitly listed, return an empty array for open_house_events.",
    "Do not fabricate."
  ].join(" ");
}

export function buildOpenHouseUserPrompt(
  address: string,
  preferredListingUrls: string[] = []
): string {
  const sourceConstraint =
    preferredListingUrls.length > 0
      ? [
          "Use only these verified listing URLs as evidence:",
          ...preferredListingUrls.map((url) => `- ${url}`)
        ].join("\n")
      : "If these exact listing URLs are unavailable, search only zillow.com, redfin.com, and realtor.com for this exact property address.";

  return [
    `Are there any open houses for ${address}?`,
    sourceConstraint,
    "If so, please give the response in this structured output."
  ].join("\n");
}
