import { stackServerApp } from "@web/src/lib/core/auth/stack/server";
import type { CurrentServerUser } from "@stackframe/stack";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { getCallContext } from "@web/src/server/infra/logger/callContext";
import { ApiError } from "@web/src/server/errors/api";
import { StatusCode } from "@web/src/server/errors/api";
import { requireListingAccess as requireListingAccessImpl } from "@web/src/server/models/listings/access";

const logger = createChildLogger(baseLogger, { module: "auth" });

export { ApiError };

export async function requireListingAccess(
  listingId: string | null | undefined,
  userId: string
) {
  if (getCallContext()?.caller) {
    logger.debug({ listingId, userId }, "Auth check: requireListingAccess");
  }
  return requireListingAccessImpl(listingId, userId);
}

export async function requireAuthenticatedUser(): Promise<CurrentServerUser> {
  if (getCallContext()?.caller) {
    logger.debug("Auth check: requireAuthenticatedUser");
  }
  const user = await stackServerApp.getUser();

  if (!user) {
    throw new ApiError(StatusCode.UNAUTHORIZED, {
      error: "Unauthorized",
      message: "Please sign in to continue"
    });
  }

  return user;
}
