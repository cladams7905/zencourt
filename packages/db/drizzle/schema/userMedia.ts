import { authenticatedRole, authUid, crudPolicy } from "drizzle-orm/neon";
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { mediaTypeEnum } from "./enums";

export const userMedia = pgTable(
  "user_media",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    type: mediaTypeEnum("type").notNull(),
    url: text("url").notNull(),
    usageCount: integer("usage_count").default(0).notNull(),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull()
  },
  (table) => [
    index("user_media_user_id_idx").on(table.userId),
    index("user_media_type_idx").on(table.type),
    crudPolicy({
      role: authenticatedRole,
      read: authUid(table.userId),
      modify: authUid(table.userId)
    })
  ]
);
