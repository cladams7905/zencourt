import { authenticatedRole, crudPolicy } from "drizzle-orm/neon";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { content } from "./content";

export const imageContent = pgTable(
  "image_content",
  {
    id: text("id").primaryKey(),
    contentId: text("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    textOverlays: jsonb("text_overlays").$type<unknown>(),
    styles: jsonb("styles").$type<Record<string, unknown>>(),
    imageOrder: integer("image_order"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    index("image_content_content_id_idx").on(table.contentId),
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
