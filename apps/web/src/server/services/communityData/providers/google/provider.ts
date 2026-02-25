import { CommunityDataProvider } from "@web/src/server/services/_config/community";
import type { CommunityDataProviderStrategy } from "../types";
import {
  getCommunityDataByZip,
  getCommunityDataByZipAndAudience
} from "./pipeline";

export function createGoogleCommunityDataProvider(): CommunityDataProviderStrategy {
  return {
    provider: CommunityDataProvider.Google,
    async getCommunityDataByZip(params) {
      return getCommunityDataByZip(
        params.zipCode,
        params.serviceAreas,
        params.preferredCity,
        params.preferredState,
        params.options
      );
    },
    async getCommunityDataByZipAndAudience(params) {
      return getCommunityDataByZipAndAudience(
        params.zipCode,
        params.audienceSegment,
        params.serviceAreas,
        params.preferredCity,
        params.preferredState
      );
    }
  };
}
