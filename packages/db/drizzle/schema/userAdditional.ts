import { authenticatedRole, authUid, crudPolicy } from "drizzle-orm/neon";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";

import { accountTypeEnum, paymentPlanEnum } from "./enums";

export const userAdditional = pgTable(
  "user_additional",
  {
    userId: text("user_id").primaryKey(),
    accountType: accountTypeEnum("account_type").notNull().default("basic"),
    location: text("location"),
    paymentPlan: paymentPlanEnum("payment_plan").notNull().default("free"),
    weeklyGenerationLimit: integer("weekly_generation_limit"),
    avatarImageUrl: text("avatar_image_url"),
    brokerLogoUrl: text("broker_logo_image_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    index("user_additional_user_id_idx").on(table.userId),
    crudPolicy({
      role: authenticatedRole,
      read: authUid(table.userId),
      modify: authUid(table.userId)
    })
  ]
);
