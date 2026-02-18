import {
  getCommunityAudienceCacheKey,
  getCommunityCacheKey,
  getCommunityCategoryCacheKey,
  getCommunitySeasonalCacheKey,
  getCityDescriptionCacheKey,
  getPlaceDetailsCacheKey,
  getPlacePoolCacheKey,
  isPoolStale
} from "@web/src/server/services/communityData/providers/google/cache/keys";

describe("google cache keys", () => {
  it("builds base and category keys", () => {
    expect(getCommunityCacheKey("78701", "Austin", "tx")).toContain(
      "community:78701:TX:austin"
    );
    expect(
      getCommunityCategoryCacheKey("78701", "dining", "Austin", "TX")
    ).toContain(":cat:dining");
    expect(getCommunitySeasonalCacheKey("78701", "Austin", "TX")).toContain(
      ":seasonal"
    );
  });

  it("builds audience/place/city keys", () => {
    expect(
      getCommunityAudienceCacheKey(
        "78701",
        "growing_families",
        ["Austin,TX"],
        "Austin",
        "TX"
      )
    ).toContain(":aud:growing_families");
    expect(getPlaceDetailsCacheKey("pid")).toBe("community:place:pid");
    expect(getCityDescriptionCacheKey("Austin", "tx")).toContain(
      "community:citydesc:TX:austin"
    );
    expect(
      getPlacePoolCacheKey(
        "78701",
        "dining",
        "aud",
        ["Austin,TX"],
        "Austin",
        "TX"
      )
    ).toContain(":pool:");
  });

  it("detects stale pool timestamps", () => {
    expect(isPoolStale()).toBe(true);
    expect(isPoolStale("not-a-date")).toBe(true);
    expect(isPoolStale(new Date().toISOString())).toBe(false);
  });
});
