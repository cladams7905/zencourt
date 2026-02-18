import { CommunityDataProvider } from "./types";

export const COMMUNITY_DATA_PROVIDER = "COMMUNITY_DATA_PROVIDER";
export const DEFAULT_COMMUNITY_DATA_PROVIDER: CommunityDataProvider =
  CommunityDataProvider.Perplexity;

export function getCommunityDataProvider(): CommunityDataProvider {
  const raw = process.env[COMMUNITY_DATA_PROVIDER] ?? "";
  if (raw === CommunityDataProvider.Perplexity) {
    return CommunityDataProvider.Perplexity;
  }
  if (raw === CommunityDataProvider.Google) {
    return CommunityDataProvider.Google;
  }
  return DEFAULT_COMMUNITY_DATA_PROVIDER;
}
