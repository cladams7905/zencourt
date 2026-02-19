import {
  peekNextCommunityCategories,
  selectCommunityCategories,
  selectRotatedAudienceSegment
} from "../service";

describe("contentRotation/service", () => {
  it("returns first segment when redis is missing", async () => {
    await expect(
      selectRotatedAudienceSegment(null, "user-1", "community", ["a", "b"])
    ).resolves.toEqual(["a"]);
  });

  it("rotates audience segment when redis has previous value", async () => {
    const redis = {
      get: jest.fn().mockResolvedValue("a"),
      set: jest.fn().mockResolvedValue(undefined)
    };

    await expect(
      selectRotatedAudienceSegment(redis as never, "user-1", "community", [
        "a",
        "b"
      ])
    ).resolves.toEqual(["b"]);
    expect(redis.set).toHaveBeenCalled();
  });

  it("selects categories from available keys when redis is missing", async () => {
    const result = await selectCommunityCategories(null, "user-1", 2, [
      "dining_list",
      "shopping_list",
      "education_list"
    ]);

    expect(result.selected).toHaveLength(2);
    expect(result.shouldRefresh).toBe(false);
  });

  it("peeks next categories from cached cycle state", async () => {
    const redis = {
      get: jest.fn().mockResolvedValue({
        remaining: ["dining_list", "shopping_list"],
        cyclesCompleted: 1
      })
    };

    await expect(
      peekNextCommunityCategories(redis as never, "user-1", 1)
    ).resolves.toEqual(["dining_list"]);
  });
});
