import { authenticatedRole, authUid, crudPolicy } from "drizzle-orm/neon";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { listingStageEnum } from "./enums";
import type { ListingPropertyDetails } from "@shared/types/models";

export const listings = pgTable(
  "listings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title"),
    address: text("address"),
    lastOpenedAt: timestamp("last_opened_at"),
    propertyDetails: jsonb("property_details").$type<ListingPropertyDetails>(),
    propertyDetailsSource: text("property_details_source"),
    propertyDetailsFetchedAt: timestamp("property_details_fetched_at"),
    propertyDetailsRevision: text("property_details_revision"),
    listingStage: listingStageEnum("listing_stage")
      .notNull()
      .default("categorize"),
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
