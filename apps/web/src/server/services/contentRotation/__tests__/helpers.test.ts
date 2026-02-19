import {
  AUDIENCE_ROTATION_PREFIX,
  getCommunityCategoryCycleKey,
  getRecentHooksKey,
  shuffleArray
} from "../helpers";

describe("contentRotation/helpers", () => {
  it("builds expected Redis keys", () => {
    expect(getCommunityCategoryCycleKey("user-1")).toBe(
      "community_category_cycle:user-1"
    );
    expect(getRecentHooksKey("user-1", "community")).toBe(
      "recent_hooks:user-1:community"
    );
    expect(AUDIENCE_ROTATION_PREFIX).toBe("content:audience-rotation");
  });

  it("shuffles without changing members", () => {
    const input = ["a", "b", "c", "d"];
    const output = shuffleArray(input);
    expect(output).toHaveLength(input.length);
    expect([...output].sort()).toEqual([...input].sort());
  });
});
