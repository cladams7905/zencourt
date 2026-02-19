/**
 * @jest-environment node
 */

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
}));

import { redirect } from "next/navigation";

jest.mock("@web/src/server/actions/db/users", () => ({
  getUser: jest.fn()
}));
import { getUser } from "@web/src/server/actions/db/users";

import { requireUserOrRedirect } from "../requireUserOrRedirect";

const mockRedirect = jest.mocked(redirect);
const mockGetUser = jest.mocked(getUser);

describe("requireUserOrRedirect", () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockGetUser.mockReset();
  });

  it("returns the user when getUser resolves to a user object", async () => {
    const fakeUser = { id: "user-123", primaryEmail: "test@example.com" } as never;
    mockGetUser.mockResolvedValue(fakeUser);
    const user = await requireUserOrRedirect();
    expect(user).toBe(fakeUser);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects to /handler/sign-in when getUser returns null", async () => {
    mockGetUser.mockResolvedValue(null);
    await expect(requireUserOrRedirect()).rejects.toThrow(
      "REDIRECT:/handler/sign-in"
    );
    expect(mockRedirect).toHaveBeenCalledWith("/handler/sign-in");
  });

  it("does not call redirect when user is present", async () => {
    mockGetUser.mockResolvedValue({ id: "user-456" } as never);
    await requireUserOrRedirect();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
