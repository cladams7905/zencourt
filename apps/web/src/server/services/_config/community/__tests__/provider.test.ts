import {
  COMMUNITY_DATA_PROVIDER,
  DEFAULT_COMMUNITY_DATA_PROVIDER,
  getCommunityDataProvider,
  CommunityDataProvider
} from "@web/src/server/services/_config/community";

describe("community provider config", () => {
  const previous = process.env[COMMUNITY_DATA_PROVIDER];

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[COMMUNITY_DATA_PROVIDER];
    } else {
      process.env[COMMUNITY_DATA_PROVIDER] = previous;
    }
  });

  it("defaults to configured default when unset", () => {
    delete process.env[COMMUNITY_DATA_PROVIDER];
    expect(getCommunityDataProvider()).toBe(DEFAULT_COMMUNITY_DATA_PROVIDER);
  });

  it("accepts google", () => {
    process.env[COMMUNITY_DATA_PROVIDER] = "google";
    expect(getCommunityDataProvider()).toBe(CommunityDataProvider.Google);
  });

  it("accepts perplexity", () => {
    process.env[COMMUNITY_DATA_PROVIDER] = "perplexity";
    expect(getCommunityDataProvider()).toBe(CommunityDataProvider.Perplexity);
  });

  it("falls back to default for invalid values", () => {
    process.env[COMMUNITY_DATA_PROVIDER] = "invalid";
    expect(getCommunityDataProvider()).toBe(DEFAULT_COMMUNITY_DATA_PROVIDER);
  });
});
