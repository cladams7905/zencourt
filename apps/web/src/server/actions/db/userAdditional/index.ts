export { getOrCreateUserAdditional, getUserProfileCompletion } from "./queries";

export {
  completeWelcomeSurvey,
  updateTargetAudiences,
  updateUserProfile,
  updateUserLocation,
  updateWritingStyle,
  markProfileCompleted,
  markWritingStyleCompleted
} from "./mutations";

export { ensureGoogleHeadshot } from "./media";

export type {
  LocationDetailsInput,
  WelcomeSurveyUpdates,
  TargetAudienceUpdates,
  UserProfileUpdates,
  WritingStyleUpdates
} from "./types";
