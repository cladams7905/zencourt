import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  varchar
} from "drizzle-orm/pg-core";
import { authenticatedRole, crudPolicy } from "drizzle-orm/neon";

import type { ImageMetadata } from "@shared/types/models";

import { collections } from "./collections";
import { projects } from "./projects";

export const collectionImages = pgTable(
  "collection_images",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    url: text("url").notNull(),
    category: varchar("category", { length: 50 }),
    confidence: real("confidence"),
    features: jsonb("features").$type<string[]>(),
    sceneDescription: text("scene_description"),
    sortOrder: integer("sort_order"),
    metadata: jsonb("metadata").$type<ImageMetadata>(),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull()
  },
  (table) => [
    index("collection_images_collection_id_idx").on(table.collectionId),
    crudPolicy({
      role: authenticatedRole,
      read: sql`(select ${projects.userId} = auth.user_id()
        from ${projects}
        join ${collections} on ${collections.projectId} = ${projects.id}
        where ${collections.id} = ${table.collectionId})`,
      modify: sql`(select ${projects.userId} = auth.user_id()
        from ${projects}
        join ${collections} on ${collections.projectId} = ${projects.id}
        where ${collections.id} = ${table.collectionId})`
    })
  ]
);
