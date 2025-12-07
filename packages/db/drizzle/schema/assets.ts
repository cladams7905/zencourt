import { authenticatedRole, crudPolicy } from "drizzle-orm/neon";
import {
  index,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import {
  assetGenerationStageEnum,
  assetGenerationTypeEnum
} from "./enums";
import { projects } from "./projects";

export const assets = pgTable(
  "assets",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title"),
    type: assetGenerationTypeEnum("generation_type").notNull(),
    stage: assetGenerationStageEnum("generation_stage")
      .notNull()
      .default("upload"),
    thumbnailUrl: text("thumbnail_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    index("assets_project_id_idx").on(table.projectId),
    index("assets_type_idx").on(table.type),
    crudPolicy({
      role: authenticatedRole,
      read: sql`(select ${projects.userId} = auth.user_id() from ${projects} where ${projects.id} = ${table.projectId})`,
      modify: sql`(select ${projects.userId} = auth.user_id() from ${projects} where ${projects.id} = ${table.projectId})`
    })
  ]
);
