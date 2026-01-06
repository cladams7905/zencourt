import {
  content,
  contentStatusEnum,
  contentTypeEnum,
  socialPlatformEnum
} from "@db/client";

export type DBContent = typeof content.$inferSelect;

export type InsertDBContent = typeof content.$inferInsert;

export type ContentType = (typeof contentTypeEnum.enumValues)[number];

export type ContentStatus = (typeof contentStatusEnum.enumValues)[number];

export type SocialPlatform =
  (typeof socialPlatformEnum.enumValues)[number];
