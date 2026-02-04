import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  varchar
} from "drizzle-orm/pg-core";
import { authenticatedRole, crudPolicy } from "drizzle-orm/neon";
import { content } from "./content";
import { videoContent } from "./videoContent";
import { videoStatusEnum } from "./enums";

export const videoRenderJobs = pgTable(
  "video_render_jobs",
  {
    id: text("id").primaryKey(),
    videoContentId: text("video_content_id")
      .notNull()
      .references(() => videoContent.id, { onDelete: "cascade" }),
    status: videoStatusEnum("status").notNull().default("pending"),
    progress: integer("progress").default(0),
    videoUrl: text("video_url"),
    thumbnailUrl: text("thumbnail_url"),
    errorMessage: text("error_message"),
    errorType: varchar("error_type", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at")
  },
  (table) => [
    index("video_render_jobs_video_content_id_idx").on(table.videoContentId),
    index("video_render_jobs_status_idx").on(table.status),
    crudPolicy({
      role: authenticatedRole,
      read: sql`(select ${content.userId} = auth.user_id() from ${content}
        join ${videoContent} on ${videoContent.contentId} = ${content.id}
        where ${videoContent.id} = ${table.videoContentId})`,
      modify: sql`(select ${content.userId} = auth.user_id() from ${content}
        join ${videoContent} on ${videoContent.contentId} = ${content.id}
        where ${videoContent.id} = ${table.videoContentId})`
    })
  ]
);
