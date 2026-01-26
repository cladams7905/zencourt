import type {
  AudienceSegment,
  CommunityDataProvider
} from "../communityDataConfig";

export const COMMUNITY_DATA_PROVIDER_ENV = "COMMUNITY_DATA_PROVIDER";
export const DEFAULT_COMMUNITY_DATA_PROVIDER: CommunityDataProvider = "perplexity";

export function getWhySuitableFieldKey(
  audience?: AudienceSegment
): string {
  return audience ? `why_suitable_for_${audience}` : "why_suitable_for_audience";
}
