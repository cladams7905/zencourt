import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { authenticatedRole, crudPolicy } from "drizzle-orm/neon";

import type { VideoMetadata } from "@shared/types/models";

import { content } from "./content";
import { videoStatusEnum } from "./enums";

export const videoContent = pgTable(
  "video_content",
  {
    id: text("id").primaryKey(),
    contentId: text("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    videoUrl: text("video_url"),
    thumbnailUrl: text("thumbnail_url"),
    status: videoStatusEnum("status").notNull().default("pending"),
    metadata: jsonb("metadata").$type<VideoMetadata>(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    index("video_content_content_id_idx").on(table.contentId),
    index("video_content_status_idx").on(table.status),
    index("video_content_content_status_idx").on(
      table.contentId,
      table.status
    ),
    crudPolicy({
      role: authenticatedRole,
      read: sql`(select ${content.userId} = auth.user_id()
        from ${content}
        where ${content.id} = ${table.contentId})`,
      modify: sql`(select ${content.userId} = auth.user_id()
        from ${content}
        where ${content.id} = ${table.contentId})`
    })
  ]
);
