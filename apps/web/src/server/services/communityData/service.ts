import { createCommunityDataOrchestrator } from "./orchestrator";

const communityDataOrchestrator = createCommunityDataOrchestrator();

export const getCommunityDataByZip =
  communityDataOrchestrator.getCommunityDataByZip;
export const getCommunityDataByZipAndAudience =
  communityDataOrchestrator.getCommunityDataByZipAndAudience;
export const getCommunityContentContext =
  communityDataOrchestrator.getCommunityContentContext;
export type {
  CommunityContentContext,
  CommunityContentContextParams
} from "./orchestrator";
