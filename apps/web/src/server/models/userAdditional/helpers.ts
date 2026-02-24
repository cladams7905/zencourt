"use server";

import { db, userAdditional } from "@db/client";
import type { DBUserAdditional, InsertDBUserAdditional } from "@db/types/models";

export async function ensureUserAdditionalExists(userId: string): Promise<void> {
  await db.insert(userAdditional).values({ userId }).onConflictDoNothing();
}

export async function upsertUserAdditional(
  userId: string,
  patch: Partial<InsertDBUserAdditional>,
  notFoundMessage: string
): Promise<DBUserAdditional> {
  const [record] = await db
    .insert(userAdditional)
    .values({
      userId,
      ...patch
    })
    .onConflictDoUpdate({
      target: userAdditional.userId,
      set: patch
    })
    .returning();

  if (!record) {
    throw new Error(notFoundMessage);
  }

  return record;
}
