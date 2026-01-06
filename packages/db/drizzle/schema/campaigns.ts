import { authenticatedRole, authUid, crudPolicy } from "drizzle-orm/neon";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { campaignStageEnum } from "./enums";

export const campaigns = pgTable(
  "campaigns",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title"),
    campaignStage: campaignStageEnum("campaign_stage")
      .notNull()
      .default("upload"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    index("campaigns_user_id_idx").on(table.userId),
    crudPolicy({
      role: authenticatedRole,
      read: authUid(table.userId),
      modify: authUid(table.userId)
    })
  ]
);
