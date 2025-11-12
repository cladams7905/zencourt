"use server";

import { CurrentUser } from "@stackframe/stack";
import { stackServerApp } from "@web/src/lib/stack/server";

/**
 * Gets the current authenticated user or throws an error if no user is found.
 * @returns the user.
 */
export async function getUser(): Promise<CurrentUser> {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }
  return user;
}
