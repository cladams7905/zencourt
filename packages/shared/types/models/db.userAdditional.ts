import { userAdditional } from "@db/client";

export type DBUserAdditional = typeof userAdditional.$inferSelect;
export type InsertDBUserAdditional = typeof userAdditional.$inferInsert;
