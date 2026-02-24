export {
  getOrCreateUserAdditional,
  getUserProfileCompletion,
  getUserAdditionalSnapshot
} from "./queries";

export {
  completeWelcomeSurvey,
  updateTargetAudiences,
  updateUserProfile,
  updateUserLocation,
  updateWritingStyle,
  markProfileCompleted,
  markWritingStyleCompleted
} from "./mutations";

export type {
  LocationDetailsInput,
  UserAdditionalSnapshot,
  WelcomeSurveyUpdates,
  TargetAudienceUpdates,
  UserProfileUpdates,
  WritingStyleUpdates
} from "./types";
