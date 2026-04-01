import { renderHook } from "@testing-library/react";
import { markCurrentUserProfileCompleted } from "@web/src/server/actions/user/commands";
import { useMarkProfileCompleted } from "../useMarkProfileCompleted";

jest.mock("@web/src/server/actions/user/commands", () => ({
  markCurrentUserProfileCompleted: jest.fn()
}));

const mockMarkCurrentUserProfileCompleted = jest.mocked(
  markCurrentUserProfileCompleted
);

describe("useMarkProfileCompleted", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not mark the profile when disabled", () => {
    renderHook(() => useMarkProfileCompleted(false, "user-1"));

    expect(mockMarkCurrentUserProfileCompleted).not.toHaveBeenCalled();
  });

  it("marks the profile on mount and when the user id changes while enabled", () => {
    const { rerender } = renderHook(
      ({ enabled, userId }) => useMarkProfileCompleted(enabled, userId),
      { initialProps: { enabled: true, userId: "user-1" } }
    );

    expect(mockMarkCurrentUserProfileCompleted).toHaveBeenCalledTimes(1);

    rerender({ enabled: true, userId: "user-2" });

    expect(mockMarkCurrentUserProfileCompleted).toHaveBeenCalledTimes(2);
  });
});
