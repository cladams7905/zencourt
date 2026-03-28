import { stackServerApp } from "@web/src/lib/core/auth/stack/server";
import type { CurrentServerUser } from "@stackframe/stack";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { ApiError } from "@web/src/server/errors/api";
import { StatusCode } from "@web/src/server/errors/api";
import { requireListingAccess as requireListingAccessImpl } from "@web/src/server/models/listings/access";

const logger = createChildLogger(baseLogger, { module: "auth" });

export { ApiError };

async function requireListingAccess(
  listingId: string | null | undefined,
  userId: string
) {
  return requireListingAccessImpl(listingId, userId);
}

async function requireAuthenticatedUser(): Promise<CurrentServerUser> {
  const user = await stackServerApp.getUser();

  if (!user) {
    logger.error("requireAuthenticatedUser: no user found");
    throw new ApiError(StatusCode.UNAUTHORIZED, {
      error: "Unauthorized",
      message: "Please sign in to continue"
    });
  }

  return user;
}

export async function withCurrentUser<T>(
  run: (context: { user: CurrentServerUser }) => Promise<T>
): Promise<T> {
  const user = await requireAuthenticatedUser();
  return run({ user });
}

export async function withCurrentUserListingAccess<T>(
  listingIdOrResolver:
    | string
    | ((context: { user: CurrentServerUser }) => string | Promise<string>),
  run: (context: {
    user: CurrentServerUser;
    listing: Awaited<ReturnType<typeof requireListingAccessImpl>>;
  }) => Promise<T>
): Promise<T> {
  const user = await requireAuthenticatedUser();
  const listingId =
    typeof listingIdOrResolver === "function"
      ? await listingIdOrResolver({ user })
      : listingIdOrResolver;
  const listing = await requireListingAccess(listingId, user.id);
  return run({ user, listing });
}
