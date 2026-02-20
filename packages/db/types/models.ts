import {
  content,
  contentStatusEnum,
  contentTypeEnum,
  listingImages,
  listings,
  listingStageEnum,
  mediaTypeEnum,
  socialPlatformEnum,
  userAdditional,
  userMedia,
  videoGenBatch,
  videoGenJobs,
  videoStatusEnum
} from "../drizzle/schema";

export type DBContent = typeof content.$inferSelect;
export type InsertDBContent = typeof content.$inferInsert;
export type ContentType = (typeof contentTypeEnum.enumValues)[number];
export type ContentStatus = (typeof contentStatusEnum.enumValues)[number];
export type SocialPlatform = (typeof socialPlatformEnum.enumValues)[number];

export type DBListing = typeof listings.$inferSelect & {
  primaryContentId?: string | null;
  thumbnailUrl?: string | null;
  contents?: DBContent[];
};
export type InsertDBListing = typeof listings.$inferInsert;
export type ListingStage = (typeof listingStageEnum.enumValues)[number];

export type DBListingImage = typeof listingImages.$inferSelect;
export type InsertDBListingImage = typeof listingImages.$inferInsert;

export type DBUserAdditional = typeof userAdditional.$inferSelect;
export type InsertDBUserAdditional = typeof userAdditional.$inferInsert;

export type DBUserMedia = typeof userMedia.$inferSelect;
export type InsertDBUserMedia = typeof userMedia.$inferInsert;
export type UserMediaType = (typeof mediaTypeEnum.enumValues)[number];

export type DBVideoGenBatch = typeof videoGenBatch.$inferSelect;
export type InsertDBVideoGenBatch = typeof videoGenBatch.$inferInsert;

export type DBVideoGenJob = typeof videoGenJobs.$inferSelect;
export type InsertDBVideoGenJob = typeof videoGenJobs.$inferInsert;
export type VideoStatus = (typeof videoStatusEnum.enumValues)[number];
