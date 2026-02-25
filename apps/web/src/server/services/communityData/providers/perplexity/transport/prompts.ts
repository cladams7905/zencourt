import type {
  AudienceSegment,
  CategoryKey
} from "@web/src/server/services/_config/community";
import { getCategoryDisplayLimit } from "@web/src/server/services/_config/community";
import type { PerplexityMessage } from "@web/src/server/integrations/perplexity";
import { getWhySuitableFieldKey } from "./helpers";

const AUDIENCE_LABELS: Record<AudienceSegment, string> = {
  first_time_homebuyers: "first-time homebuyers",
  growing_families: "growing families",
  downsizers_retirees: "downsizers and retirees",
  luxury_homebuyers: "luxury homebuyers",
  investors_relocators: "investors and relocators"
};

export function getAudienceLabel(audience?: AudienceSegment): string {
  return audience ? AUDIENCE_LABELS[audience] : "local residents";
}

function buildCategoryNotes(category: CategoryKey): string[] {
  switch (category) {
    case "dining":
      return [
        'Include cuisine as a short array (e.g., ["italian", "seafood"]).',
        "Prefer locally owned spots over national chains when possible."
      ];
    case "coffee_brunch":
      return [
        'Include cuisine as a short array (e.g., ["coffee", "bakery"]).',
        "Prefer local cafes or bakeries."
      ];
    case "nature_outdoors":
      return [
        "Focus on parks, trails, or scenic areas. If needed, include a short safety disclaimer."
      ];
    case "nightlife_social":
      return [
        "Call out the vibe (brewery, cocktail bar, live music, etc.) in description."
      ];
    case "education":
      return [
        "Focus on larger 4-year universities and campus events in the area.",
        "Include university sports options and the mascot when available.",
        "Add a brief community-relevant detail about each university.",
        "Include libraries with a focus on events, classes, or programs.",
        "Do NOT include K-12 schools, school districts, or random educational centers."
      ];
    case "entertainment":
      return [
        "Look for live music venues, theaters, comedy clubs, or family entertainment."
      ];
    case "arts_culture":
      return [
        "Look for museums, galleries, cultural centers, or performing arts."
      ];
    case "attractions":
      return [
        "Look for historic landmarks, tours, amusement parks, zoos, aquariums, or other notable attractions."
      ];
    case "sports_rec":
      return [
        "Look for recreation centers, sports complexes, golf, or outdoor sports hubs."
      ];
    case "fitness_wellness":
      return [
        "Look for gyms, yoga studios, wellness centers, or fitness classes."
      ];
    case "shopping":
      return [
        "Look for boutiques, local shops, markets, or notable retail districts."
      ];
    case "community_events":
      return [
        "Look for recurring community events like markets, festivals, or seasonal gatherings.",
        "Include dates or typical timing when available.",
        "Do not include past events. If no upcoming or current events are available, return an empty items array."
      ];
    case "neighborhoods":
      return [
        "Focus on named neighborhoods, subdivisions, or local districts within the zip code.",
        "Do NOT return the city name as a neighborhood."
      ];
    default:
      return [];
  }
}

function formatServiceAreas(serviceAreas?: string[] | null): string {
  if (!serviceAreas || serviceAreas.length === 0) {
    return "";
  }
  const formatted = serviceAreas.map((value) => value.trim()).filter(Boolean);
  if (formatted.length === 0) {
    return "";
  }
  return `Service areas to prioritize: ${formatted.join(", ")}.`;
}

export function buildPerplexityCommunityMessages(params: {
  category: CategoryKey;
  audience?: AudienceSegment;
  city: string;
  state: string;
  zipCode?: string;
  serviceAreas?: string[] | null;
  limit?: number;
  extraInstructions?: string;
}): PerplexityMessage[] {
  const limit = params.limit ?? getCategoryDisplayLimit(params.category);
  const audienceLabel = getAudienceLabel(params.audience);
  const serviceAreaLine = formatServiceAreas(params.serviceAreas);
  const categoryNotes = buildCategoryNotes(params.category);
  const affordabilityNote =
    params.audience === "first_time_homebuyers" &&
    ["dining", "coffee_brunch", "nightlife_social"].includes(params.category)
      ? "Prioritize affordable, budget-friendly options."
      : "";
  const notesBlock =
    categoryNotes.length > 0 ? `\n${categoryNotes.join("\n")}` : "";

  const systemPrompt = [
    "You are a meticulous local researcher helping generate interesting, unique local content for social media that positions the user as a local expert.",
    "Return only JSON that matches the provided schema.",
    "Only include real places or events, no hallucinations.",
    "Use general area descriptions, not exact street addresses.",
    "If a field is unknown, set it to null.",
    "Include citations per item with title and URL when possible, otherwise set to null.",
    'Do not mention the specific audience segment in the item text. Use "homebuyers" or neutral phrasing instead.',
    "If information is scarce or unverified, omit the item rather than guessing.",
    "If nothing suitable is within a reasonable distance, return fewer items or an empty items array."
  ].join(" ");

  const userPrompt = [
    `Target audience: ${audienceLabel}.`,
    `Location: ${params.city}, ${params.state}${params.zipCode ? ` ${params.zipCode}` : ""}.`,
    `Category type: ${params.category}.`,
    serviceAreaLine,
    `Provide up to ${limit} items.`,
    "If there are not enough suitable options within a reasonable distance, return fewer items or an empty array.",
    "Do not include items with limited or unverifiable information.",
    `Each item should include: name, location, description, cost, dates (for events), ${getWhySuitableFieldKey(
      params.audience
    )}, and optional cuisine/disclaimer when relevant.`,
    'Do not reference the specific audience segment in the item text. Use "homebuyers" or neutral phrasing instead.',
    "Estimate drive_distance_minutes from the city center.",
    params.extraInstructions,
    affordabilityNote,
    notesBlock
  ]
    .filter(Boolean)
    .join("\n");

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];
}
