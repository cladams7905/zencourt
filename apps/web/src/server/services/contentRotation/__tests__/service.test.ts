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

  it("returns first segment when redis read fails", async () => {
    const redis = {
      get: jest.fn().mockRejectedValue(new Error("boom")),
      set: jest.fn()
    };

    await expect(
      selectRotatedAudienceSegment(redis as never, "user-1", "community", [
        "a",
        "b"
      ])
    ).resolves.toEqual(["a"]);
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

  it("returns empty selection when available keys is empty", async () => {
    await expect(
      selectCommunityCategories(null, "user-1", 2, [])
    ).resolves.toEqual({
      selected: [],
      shouldRefresh: false
    });
  });

  it("selects and persists using cached array state", async () => {
    const redis = {
      get: jest.fn().mockResolvedValue(["dining_list", "shopping_list"]),
      set: jest.fn().mockResolvedValue(undefined)
    };

    const result = await selectCommunityCategories(
      redis as never,
      "user-1",
      1,
      ["dining_list", "shopping_list", "education_list"]
    );

    expect(result.selected).toHaveLength(1);
    expect(redis.set).toHaveBeenCalledWith(
      "community_category_cycle:user-1",
      expect.objectContaining({
        remaining: expect.any(Array),
        cyclesCompleted: expect.any(Number)
      })
    );
  });

  it("handles redis write failure by returning selected values", async () => {
    const redis = {
      get: jest.fn().mockResolvedValue({
        remaining: ["dining_list"],
        cyclesCompleted: 1
      }),
      set: jest.fn().mockRejectedValue(new Error("set failed"))
    };

    const result = await selectCommunityCategories(
      redis as never,
      "user-1",
      2,
      ["dining_list", "shopping_list"]
    );

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

  it("handles array cache and redis errors when peeking categories", async () => {
    const redisArray = {
      get: jest.fn().mockResolvedValue(["dining_list", "shopping_list"])
    };
    await expect(
      peekNextCommunityCategories(redisArray as never, "user-1", 2)
    ).resolves.toEqual(["dining_list", "shopping_list"]);

    const redisError = {
      get: jest.fn().mockRejectedValue(new Error("boom"))
    };
    await expect(
      peekNextCommunityCategories(redisError as never, "user-1", 2)
    ).resolves.toEqual([]);
  });
});
