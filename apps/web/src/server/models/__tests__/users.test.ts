const mockGetUser = jest.fn();

jest.mock("@web/src/lib/core/auth/stack/server", () => ({
  stackServerApp: {
    getUser: (...args: unknown[]) => ((mockGetUser as (...a: unknown[]) => unknown)(...args))
  }
}));

import { getUser } from "@web/src/server/models/users";

describe("users actions", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
  });

  it("returns current user when available", async () => {
    mockGetUser.mockResolvedValueOnce({ id: "u1" });
    await expect(getUser()).resolves.toEqual({ id: "u1" });
  });

  it("returns null when user is not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce(null);
    await expect(getUser()).resolves.toBeNull();
  });
});
