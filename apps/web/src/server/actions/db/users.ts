"use server";

import { stackServerApp } from "../../lib/stack/server";
import { CurrentServerUser } from "@stackframe/stack";

/**
 * Gets the current authenticated user or throws an error if no user is found.
 * @returns the user.
 */
export async function getUser(): Promise<CurrentServerUser> {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }
  return user;
}
