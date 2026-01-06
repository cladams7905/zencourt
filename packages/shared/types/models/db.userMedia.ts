import { userMedia, mediaTypeEnum } from "@db/client";

export type DBUserMedia = typeof userMedia.$inferSelect;
export type InsertDBUserMedia = typeof userMedia.$inferInsert;

export type UserMediaType = (typeof mediaTypeEnum.enumValues)[number];
