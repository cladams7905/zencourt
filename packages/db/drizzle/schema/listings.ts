import { authenticatedRole, authUid, crudPolicy } from "drizzle-orm/neon";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { listingStageEnum } from "./enums";

export const listings = pgTable(
  "listings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title"),
    address: text("address"),
    listingStage: listingStageEnum("listing_stage")
      .notNull()
      .default("upload"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    index("listings_user_id_idx").on(table.userId),
    crudPolicy({
      role: authenticatedRole,
      read: authUid(table.userId),
      modify: authUid(table.userId)
    })
  ]
);
