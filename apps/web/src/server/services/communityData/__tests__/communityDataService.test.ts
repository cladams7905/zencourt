const mockGetPerplexityCommunityData = jest.fn();
const mockGetPerplexityByCategories = jest.fn();
const mockGetPerplexityMonthlyEvents = jest.fn();
const mockPrefetchPerplexityCategories = jest.fn();

const mockGetGoogleByZip = jest.fn();
const mockGetGoogleByZipAndAudience = jest.fn();
const mockResolveLocationOrWarn = jest.fn();
const mockToOriginLocationInput = jest.fn();

jest.mock("@web/src/server/services/community/providers/perplexity", () => ({
  getPerplexityCommunityData: (...args: unknown[]) =>
    mockGetPerplexityCommunityData(...args),
  getPerplexityCommunityDataByZipAndAudienceForCategories: (
    ...args: unknown[]
  ) => mockGetPerplexityByCategories(...args),
  getPerplexityMonthlyEventsSectionByZip: (...args: unknown[]) =>
    mockGetPerplexityMonthlyEvents(...args),
  prefetchPerplexityCategoriesByZip: (...args: unknown[]) =>
    mockPrefetchPerplexityCategories(...args)
}));

jest.mock("@web/src/server/services/community/providers/google", () => ({
  getCommunityDataByZip: (...args: unknown[]) => mockGetGoogleByZip(...args),
  getCommunityDataByZipAndAudience: (...args: unknown[]) =>
    mockGetGoogleByZipAndAudience(...args),
  resolveLocationOrWarn: (...args: unknown[]) =>
    mockResolveLocationOrWarn(...args),
  toOriginLocationInput: (...args: unknown[]) =>
    mockToOriginLocationInput(...args),
  buildAudienceCommunityData: jest.fn(),
  getCityDescription: jest.fn()
}));

import {
  getCommunityDataByZip,
  getCommunityDataByZipAndAudience,
  getPerplexityCommunityDataByZipAndAudienceForCategories,
  getPerplexityMonthlyEventsSectionByZip,
  prefetchPerplexityCategoriesByZip
} from "@web/src/server/services/communityData/service";

describe("communityDataService routing", () => {
  beforeEach(() => {
    process.env.COMMUNITY_DATA_PROVIDER = "";
    mockGetPerplexityCommunityData.mockReset();
    mockGetPerplexityByCategories.mockReset();
    mockGetPerplexityMonthlyEvents.mockReset();
    mockPrefetchPerplexityCategories.mockReset();
    mockGetGoogleByZip.mockReset();
    mockGetGoogleByZipAndAudience.mockReset();
    mockResolveLocationOrWarn.mockReset();
    mockToOriginLocationInput.mockReset();

    mockResolveLocationOrWarn.mockResolvedValue({
      city: "Austin",
      state_id: "TX",
      lat: 1,
      lng: 2
    });
    mockToOriginLocationInput.mockReturnValue({
      city: "Austin",
      state: "TX",
      lat: 1,
      lng: 2
    });
  });

  it("returns null for empty zip", async () => {
    await expect(
      getCommunityDataByZip("", null, null, null)
    ).resolves.toBeNull();
    expect(mockGetGoogleByZip).not.toHaveBeenCalled();
    expect(mockGetPerplexityCommunityData).not.toHaveBeenCalled();
  });

  it("routes to google when provider is google", async () => {
    process.env.COMMUNITY_DATA_PROVIDER = "google";
    mockGetGoogleByZip.mockResolvedValueOnce({ zip_code: "78701" });

    const result = await getCommunityDataByZip("78701");

    expect(result).toEqual({ zip_code: "78701" });
    expect(mockGetGoogleByZip).toHaveBeenCalledWith(
      "78701",
      undefined,
      undefined,
      undefined,
      undefined
    );
    expect(mockGetPerplexityCommunityData).not.toHaveBeenCalled();
  });

  it("uses perplexity first and falls back to google on error", async () => {
    process.env.COMMUNITY_DATA_PROVIDER = "perplexity";
    mockGetPerplexityCommunityData.mockRejectedValueOnce(new Error("boom"));
    mockGetGoogleByZip.mockResolvedValueOnce({ zip_code: "90210" });

    const result = await getCommunityDataByZip("90210");

    expect(mockResolveLocationOrWarn).toHaveBeenCalled();
    expect(mockGetPerplexityCommunityData).toHaveBeenCalled();
    expect(mockGetGoogleByZip).toHaveBeenCalled();
    expect(result).toEqual({ zip_code: "90210" });
  });

  it("returns perplexity data when available", async () => {
    process.env.COMMUNITY_DATA_PROVIDER = "perplexity";
    mockGetPerplexityCommunityData.mockResolvedValueOnce({ zip_code: "10001" });

    const result = await getCommunityDataByZip("10001");

    expect(result).toEqual({ zip_code: "10001" });
    expect(mockGetGoogleByZip).not.toHaveBeenCalled();
  });

  it("falls back to google when perplexity returns null", async () => {
    process.env.COMMUNITY_DATA_PROVIDER = "perplexity";
    mockGetPerplexityCommunityData.mockResolvedValueOnce(null);
    mockGetGoogleByZip.mockResolvedValueOnce({ zip_code: "73301" });

    await expect(getCommunityDataByZip("73301")).resolves.toEqual({
      zip_code: "73301"
    });
    expect(mockGetGoogleByZip).toHaveBeenCalled();
  });

  it("returns null when location cannot be resolved for perplexity route", async () => {
    process.env.COMMUNITY_DATA_PROVIDER = "perplexity";
    mockResolveLocationOrWarn.mockResolvedValueOnce(null);

    await expect(getCommunityDataByZip("73301")).resolves.toBeNull();
    expect(mockGetPerplexityCommunityData).not.toHaveBeenCalled();
  });

  it("routes audience flow and falls back to google on perplexity error", async () => {
    process.env.COMMUNITY_DATA_PROVIDER = "perplexity";
    mockGetPerplexityCommunityData.mockRejectedValueOnce(new Error("boom"));
    mockGetGoogleByZipAndAudience.mockResolvedValueOnce({ zip_code: "30301" });

    const result = await getCommunityDataByZipAndAudience(
      "30301",
      "relocators"
    );

    expect(mockGetGoogleByZipAndAudience).toHaveBeenCalled();
    expect(result).toEqual({ zip_code: "30301" });
  });

  it("routes audience flow to null when location cannot resolve", async () => {
    process.env.COMMUNITY_DATA_PROVIDER = "perplexity";
    mockResolveLocationOrWarn.mockResolvedValueOnce(null);

    await expect(
      getCommunityDataByZipAndAudience("30301", "relocators")
    ).resolves.toBeNull();
    expect(mockGetPerplexityCommunityData).not.toHaveBeenCalled();
  });

  it("re-exports perplexity ops through communityDataService", async () => {
    mockGetPerplexityByCategories.mockResolvedValueOnce({ zip_code: "11111" });
    mockGetPerplexityMonthlyEvents.mockResolvedValueOnce({
      key: "things_to_do_january",
      value: "- Event"
    });
    mockPrefetchPerplexityCategories.mockResolvedValueOnce(undefined);

    await expect(
      getPerplexityCommunityDataByZipAndAudienceForCategories("11111", [
        "dining"
      ])
    ).resolves.toEqual({ zip_code: "11111" });
    await expect(
      getPerplexityMonthlyEventsSectionByZip("11111")
    ).resolves.toEqual({
      key: "things_to_do_january",
      value: "- Event"
    });
    await expect(
      prefetchPerplexityCategoriesByZip("11111", ["dining"])
    ).resolves.toBeUndefined();

    expect(mockGetPerplexityByCategories).toHaveBeenCalled();
    expect(mockGetPerplexityMonthlyEvents).toHaveBeenCalled();
    expect(mockPrefetchPerplexityCategories).toHaveBeenCalled();
  });
});
