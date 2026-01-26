import type { CommunityDataProvider } from "../communityDataConfig";
import {
  COMMUNITY_DATA_PROVIDER_ENV,
  DEFAULT_COMMUNITY_DATA_PROVIDER
} from "./config";

export function getCommunityDataProvider(): CommunityDataProvider {
  const raw = process.env[COMMUNITY_DATA_PROVIDER_ENV] ?? "";
  if (raw === "perplexity") {
    return "perplexity";
  }
  if (raw === "google") {
    return "google";
  }
  return DEFAULT_COMMUNITY_DATA_PROVIDER;
}
