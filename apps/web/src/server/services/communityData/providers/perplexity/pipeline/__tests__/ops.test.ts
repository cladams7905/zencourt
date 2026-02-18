const mockNormalizeAudienceSegment = jest.fn();
const mockGetByCategories = jest.fn();
const mockGetMonthlyEvents = jest.fn();
const mockPrefetchCategories = jest.fn();
const mockResolveLocationOrWarn = jest.fn();
const mockToOriginLocationInput = jest.fn();

jest.mock("@web/src/server/services/community/shared/audience", () => ({
  normalizeAudienceSegment: (...args: unknown[]) =>
    mockNormalizeAudienceSegment(...args)
}));

jest.mock(
  "@web/src/server/services/community/providers/perplexity/pipeline/service",
  () => ({
    getPerplexityCommunityDataForCategories: (...args: unknown[]) =>
      mockGetByCategories(...args),
    getPerplexityMonthlyEventsSection: (...args: unknown[]) =>
      mockGetMonthlyEvents(...args),
    prefetchPerplexityCategories: (...args: unknown[]) =>
      mockPrefetchCategories(...args)
  })
);

jest.mock("@web/src/server/services/community/providers/google", () => ({
  resolveLocationOrWarn: (...args: unknown[]) =>
    mockResolveLocationOrWarn(...args),
  toOriginLocationInput: (...args: unknown[]) =>
    mockToOriginLocationInput(...args)
}));

import {
  getPerplexityCommunityDataByZipAndAudienceForCategories,
  getPerplexityMonthlyEventsSectionByZip,
  prefetchPerplexityCategoriesByZip
} from "@web/src/server/services/communityData/providers/perplexity/pipeline/zipOrchestration";

describe("perplexity ops", () => {
  beforeEach(() => {
    mockNormalizeAudienceSegment.mockReset();
    mockGetByCategories.mockReset();
    mockGetMonthlyEvents.mockReset();
    mockPrefetchCategories.mockReset();
    mockResolveLocationOrWarn.mockReset();
    mockToOriginLocationInput.mockReset();

    mockNormalizeAudienceSegment.mockReturnValue("growing_families");
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

  it("returns null for missing zip", async () => {
    await expect(
      getPerplexityCommunityDataByZipAndAudienceForCategories("", [
        "dining"
      ] as never)
    ).resolves.toBeNull();
    expect(mockResolveLocationOrWarn).not.toHaveBeenCalled();
  });

  it("returns null when location cannot be resolved", async () => {
    mockResolveLocationOrWarn.mockResolvedValueOnce(null);
    await expect(
      getPerplexityCommunityDataByZipAndAudienceForCategories("78701", [
        "dining"
      ] as never)
    ).resolves.toBeNull();
  });

  it("routes category fetch through resolved location", async () => {
    mockGetByCategories.mockResolvedValueOnce({ zip_code: "78701" });

    const result =
      await getPerplexityCommunityDataByZipAndAudienceForCategories(
        "78701",
        ["dining"] as never,
        "families"
      );

    expect(result).toEqual({ zip_code: "78701" });
    expect(mockGetByCategories).toHaveBeenCalledWith(
      expect.objectContaining({
        zipCode: "78701",
        audience: "growing_families"
      })
    );
  });

  it("routes monthly events through resolved location", async () => {
    mockGetMonthlyEvents.mockResolvedValueOnce({ key: "k", value: "v" });

    await expect(
      getPerplexityMonthlyEventsSectionByZip("78701", "families")
    ).resolves.toEqual({
      key: "k",
      value: "v"
    });
    expect(mockGetMonthlyEvents).toHaveBeenCalled();
  });

  it("prefetches categories when zip and location are valid", async () => {
    await prefetchPerplexityCategoriesByZip(
      "78701",
      ["dining"] as never,
      "families"
    );
    expect(mockPrefetchCategories).toHaveBeenCalled();
  });

  it("noops prefetch for missing zip", async () => {
    await prefetchPerplexityCategoriesByZip(
      "",
      ["dining"] as never,
      "families"
    );
    expect(mockPrefetchCategories).not.toHaveBeenCalled();
  });
});
