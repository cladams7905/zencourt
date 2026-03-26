import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  type PgTableExtraConfigValue,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { authenticatedRole, crudPolicy } from "drizzle-orm/neon";

import { listings } from "./listings";

function getVideoClipCurrentVersionForeignColumns(): [
  AnyPgColumn<{ tableName: string }>,
  AnyPgColumn<{ tableName: string }>
] {
  const { videoClipVersions } =
    require("./videoClipVersions") as typeof import("./videoClipVersions");

  return [
    videoClipVersions.videoClipId,
    videoClipVersions.id
  ] as [AnyPgColumn<{ tableName: string }>, AnyPgColumn<{ tableName: string }>];
}

export const videoClips = pgTable(
  "video_clips",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    roomId: text("room_id"),
    roomName: text("room_name").notNull(),
    category: text("category").notNull(),
    clipIndex: integer("clip_index").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    currentVideoClipVersionId: text("current_video_clip_version_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table): PgTableExtraConfigValue[] => [
    index("video_clips_listing_id_idx").on(table.listingId),
    index("video_clips_listing_sort_order_idx").on(table.listingId, table.sortOrder),
    uniqueIndex("video_clips_listing_room_clip_index_uidx").on(
      table.listingId,
      table.roomId,
      table.roomName,
      table.clipIndex
    ),
    foreignKey({
      name: "video_clips_current_video_clip_version_owner_fk",
      columns: [table.id, table.currentVideoClipVersionId],
      foreignColumns: getVideoClipCurrentVersionForeignColumns()
    }),
    crudPolicy({
      role: authenticatedRole,
      read: sql`(select ${listings.userId} = auth.user_id() from ${listings}
        where ${listings.id} = ${table.listingId})`,
      modify: sql`(select ${listings.userId} = auth.user_id() from ${listings}
        where ${listings.id} = ${table.listingId})`
    })
  ]
);
