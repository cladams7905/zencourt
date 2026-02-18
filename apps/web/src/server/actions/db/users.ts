"use server";

import { CurrentUser } from "@stackframe/stack";
import { stackServerApp } from "@web/src/lib/core/auth/stack/server";

/**
 * Gets the current authenticated user or throws an error if no user is found.
 * @returns the user.
 */
export async function getUser(): Promise<CurrentUser | null> {
  return await stackServerApp.getUser();
}
