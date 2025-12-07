import { authenticatedRole, crudPolicy } from "drizzle-orm/neon";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { projects } from "./projects";

export const collections = pgTable(
  "collections",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    index("collections_project_id_idx").on(table.projectId),
    index("collections_created_at_idx").on(table.createdAt),
    uniqueIndex("collections_project_id_unique").on(table.projectId),
    crudPolicy({
      role: authenticatedRole,
      read: sql`(select ${projects.userId} = auth.user_id() from ${projects} where ${projects.id} = ${table.projectId})`,
      modify: sql`(select ${projects.userId} = auth.user_id() from ${projects} where ${projects.id} = ${table.projectId})`
    })
  ]
);
