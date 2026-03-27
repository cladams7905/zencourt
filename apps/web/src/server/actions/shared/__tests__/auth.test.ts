const mockGetUser = jest.fn();

jest.mock("@web/src/lib/core/auth/stack/server", () => ({
  stackServerApp: {
    getUser: (...args: unknown[]) =>
      (mockGetUser as (...a: unknown[]) => unknown)(...args)
  }
}));

jest.mock("@web/src/server/models/listings/access", () => ({
  requireListingAccess: jest.fn()
}));

import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { requireListingAccess as requireListingAccessImpl } from "@web/src/server/models/listings/access";

import {
  ApiError,
  withCurrentUser,
  withCurrentUserListingAccess
} from "@web/src/server/actions/shared/auth";
import { StatusCode } from "@web/src/server/errors/api";

describe("_auth api", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    (requireListingAccessImpl as unknown as jest.Mock).mockReset();
  });

  describe("withCurrentUser", () => {
    it("returns user when stack returns user", async () => {
      const user = { id: "user-1" } as never;
      mockGetUser.mockResolvedValueOnce(user);
      await expect(
        withCurrentUser(async ({ user: currentUser }) => currentUser)
      ).resolves.toEqual(user);
    });

    it("logs debug when call context exists", async () => {
      const user = { id: "user-2" } as never;
      mockGetUser.mockResolvedValueOnce(user);

      await runWithCaller("caller", async () => {
        await expect(
          withCurrentUser(async ({ user: currentUser }) => currentUser)
        ).resolves.toEqual(user);
      });
    });

    it("throws ApiError with 401 when user is not authenticated", async () => {
      mockGetUser.mockResolvedValueOnce(null);
      try {
        await withCurrentUser(async () => null);
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).status).toBe(StatusCode.UNAUTHORIZED);
        expect((e as ApiError).body.message).toBe("Please sign in to continue");
        expect((e as ApiError).body.error).toBe("Unauthorized");
      }
    });
  });

  describe("withCurrentUserListingAccess", () => {
    it("delegates to requireListingAccessImpl", async () => {
      mockGetUser.mockResolvedValueOnce({ id: "user-1" } as never);
      (requireListingAccessImpl as unknown as jest.Mock).mockResolvedValueOnce(
        "ok"
      );

      await expect(
        withCurrentUserListingAccess(
          "listing-1",
          async ({ listing }) => listing
        )
      ).resolves.toBe("ok");
      expect(requireListingAccessImpl).toHaveBeenCalledWith(
        "listing-1",
        "user-1"
      );
    });

    it("logs debug when call context exists", async () => {
      mockGetUser.mockResolvedValueOnce({ id: "user-2" } as never);
      (requireListingAccessImpl as unknown as jest.Mock).mockResolvedValueOnce(
        "ok"
      );

      await runWithCaller("auth:requireListingAccess", async () => {
        await expect(
          withCurrentUserListingAccess(
            "listing-2",
            async ({ listing }) => listing
          )
        ).resolves.toBe("ok");
      });
    });
  });

  describe("re-exports", () => {
    it("exports ApiError", () => {
      expect(ApiError).toBeDefined();
      expect(new ApiError(401, { error: "x", message: "y" }).status).toBe(401);
    });

    it("exports access wrappers as functions", () => {
      expect(typeof withCurrentUser).toBe("function");
      expect(typeof withCurrentUserListingAccess).toBe("function");
    });
  });
});
