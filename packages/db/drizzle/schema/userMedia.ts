import { authenticatedRole, authUid, crudPolicy } from "drizzle-orm/neon";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";

import { mediaTypeEnum } from "./enums";

export const userMedia = pgTable(
  "user_media",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    type: mediaTypeEnum("type").notNull(),
    url: text("url").notNull(),
    storageKey: text("storage_key"),
    thumbnailUrl: text("thumbnail_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
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
