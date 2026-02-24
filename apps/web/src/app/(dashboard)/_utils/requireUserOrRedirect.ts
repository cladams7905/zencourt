import { redirect } from "next/navigation";
import type { CurrentUser } from "@stackframe/stack";
import { getUser } from "@web/src/server/models/users";

export async function requireUserOrRedirect(): Promise<CurrentUser> {
  const user = await getUser();
  if (!user) {
    redirect("/handler/sign-in");
  }
  return user;
}
