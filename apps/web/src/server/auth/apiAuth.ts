import { stackServerApp } from "@web/src/lib/core/auth/stack/server";
import type { CurrentServerUser } from "@stackframe/stack";
import { ApiError } from "@web/src/server/utils/apiError";
import { StatusCode } from "@web/src/server/utils/apiError";
import { requireListingAccess as requireListingAccessImpl } from "@web/src/server/models/listings/access";

export { ApiError };
export { requireListingAccessImpl as requireListingAccess };

export async function requireAuthenticatedUser(): Promise<CurrentServerUser> {
  const user = await stackServerApp.getUser();

  if (!user) {
    throw new ApiError(StatusCode.UNAUTHORIZED, {
      error: "Unauthorized",
      message: "Please sign in to continue"
    });
  }

  return user;
}
