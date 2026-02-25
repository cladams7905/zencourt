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

import {
  requireAuthenticatedUser,
  ApiError,
  requireListingAccess
} from "@web/src/server/actions/_auth/api";
import { StatusCode } from "@web/src/server/errors/api";

describe("_auth api", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
  });

  describe("requireAuthenticatedUser", () => {
    it("returns user when stack returns user", async () => {
      const user = { id: "user-1" } as never;
      mockGetUser.mockResolvedValueOnce(user);
      await expect(requireAuthenticatedUser()).resolves.toEqual(user);
    });

    it("throws ApiError with 401 when user is not authenticated", async () => {
      mockGetUser.mockResolvedValueOnce(null);
      try {
        await requireAuthenticatedUser();
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).status).toBe(StatusCode.UNAUTHORIZED);
        expect((e as ApiError).body.message).toBe("Please sign in to continue");
        expect((e as ApiError).body.error).toBe("Unauthorized");
      }
    });
  });

  describe("re-exports", () => {
    it("exports ApiError", () => {
      expect(ApiError).toBeDefined();
      expect(new ApiError(401, { error: "x", message: "y" }).status).toBe(401);
    });

    it("exports requireListingAccess as function", () => {
      expect(typeof requireListingAccess).toBe("function");
    });
  });
});
