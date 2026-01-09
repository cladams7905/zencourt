import { authenticatedRole, crudPolicy } from "drizzle-orm/neon";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import {
  contentStatusEnum,
  contentTypeEnum,
  socialPlatformEnum
} from "./enums";
import { listings } from "./listings";

export const content = pgTable(
  "content",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .references(() => listings.id, { onDelete: "set null" }),
    userId: text("user_id").notNull(),
    contentType: contentTypeEnum("content_type").notNull(),
    status: contentStatusEnum("status").notNull().default("draft"),
    thumbnailUrl: text("thumbnail_url"),
    scheduledFor: timestamp("scheduled_for"),
    targetPlatforms: socialPlatformEnum("target_platforms").array(),
    platformSchedule: jsonb("platform_schedule").$type<
      Record<string, { scheduledAt?: string }>
    >(),
    isFavorite: boolean("is_favorite").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    index("content_user_id_idx").on(table.userId),
    index("content_listing_id_idx").on(table.listingId),
    index("content_type_idx").on(table.contentType),
    index("content_status_idx").on(table.status),
    crudPolicy({
      role: authenticatedRole,
      read: sql`${table.userId} = auth.user_id()`,
      modify: sql`${table.userId} = auth.user_id()`
    })
  ]
);
