const mockGetUtcMonthKey = jest.fn();
const mockBuildCategoryList = jest.fn();
const mockBuildCommunityData = jest.fn();
const mockFetchCategoryPayload = jest.fn();
const mockFetchMonthlyPayload = jest.fn();
const mockFormatAudienceLabel = jest.fn();
const mockFormatPerplexityCategoryList = jest.fn();

jest.mock("@web/src/server/services/communityData/shared/common", () => ({
  ALL_CATEGORY_KEYS: ["dining", "community_events"],
  getUtcMonthKey: (...args: unknown[]) => mockGetUtcMonthKey(...args)
}));

jest.mock(
  "@web/src/server/services/communityData/providers/perplexity/pipeline/assembly",
  () => ({
    buildCategoryList: (...args: unknown[]) => mockBuildCategoryList(...args),
    buildPerplexityCommunityData: (...args: unknown[]) =>
      mockBuildCommunityData(...args)
  })
);

jest.mock(
  "@web/src/server/services/communityData/providers/perplexity/pipeline/fetching",
  () => ({
    fetchPerplexityCategoryPayload: (...args: unknown[]) =>
      mockFetchCategoryPayload(...args),
    fetchPerplexityMonthlyEventsPayload: (...args: unknown[]) =>
      mockFetchMonthlyPayload(...args),
    formatAudienceLabel: (...args: unknown[]) =>
      mockFormatAudienceLabel(...args)
  })
);

jest.mock(
  "@web/src/server/services/communityData/providers/perplexity/pipeline/formatting",
  () => ({
    formatPerplexityCategoryList: (...args: unknown[]) =>
      mockFormatPerplexityCategoryList(...args)
  })
);

import {
  getPerplexityMonthlyEventsSection,
  prefetchPerplexityCategories,
  getPerplexityCommunityDataForCategories,
  getPerplexityCommunityData
} from "@web/src/server/services/communityData/providers/perplexity/pipeline/service";

describe("perplexity service", () => {
  beforeEach(() => {
    mockGetUtcMonthKey.mockReset();
    mockBuildCategoryList.mockReset();
    mockBuildCommunityData.mockReset();
    mockFetchCategoryPayload.mockReset();
    mockFetchMonthlyPayload.mockReset();
    mockFormatAudienceLabel.mockReset();
    mockFormatPerplexityCategoryList.mockReset();

    mockGetUtcMonthKey.mockReturnValue("february");
    mockFormatAudienceLabel.mockReturnValue("families");
    mockBuildCategoryList.mockReturnValue("- List");
    mockFormatPerplexityCategoryList.mockReturnValue("- Events");
    mockBuildCommunityData.mockReturnValue({ zip_code: "78701" });
  });

  it("returns null monthly section when payload is empty", async () => {
    mockFetchMonthlyPayload.mockResolvedValueOnce(null);

    await expect(
      getPerplexityMonthlyEventsSection({
        zipCode: "78701",
        location: { city: "Austin", state: "TX", lat: 1, lng: 2 }
      })
    ).resolves.toBeNull();
  });

  it("returns keyed monthly events section", async () => {
    mockFetchMonthlyPayload.mockResolvedValueOnce({
      items: [{ name: "Event" }]
    });

    await expect(
      getPerplexityMonthlyEventsSection({
        zipCode: "78701",
        location: { city: "Austin", state: "TX", lat: 1, lng: 2 },
        audience: "growing_families"
      })
    ).resolves.toEqual({ key: "things_to_do_february", value: "- Events" });
  });

  it("prefetches unique categories", async () => {
    mockFetchCategoryPayload.mockResolvedValue({ items: [{ name: "Cafe" }] });

    await prefetchPerplexityCategories({
      zipCode: "78701",
      location: { city: "Austin", state: "TX", lat: 1, lng: 2 },
      categories: ["dining", "dining", "community_events"] as never
    });

    expect(mockFetchCategoryPayload).toHaveBeenCalledTimes(2);
  });

  it("builds category community data for selected categories", async () => {
    mockFetchCategoryPayload.mockResolvedValue({ items: [{ name: "Cafe" }] });

    const result = await getPerplexityCommunityDataForCategories({
      zipCode: "78701",
      location: { city: "Austin", state: "TX", lat: 1, lng: 2 },
      categories: ["dining", "dining"] as never,
      eventsSection: { key: "things_to_do_february", value: "- Events" }
    });

    expect(result).toEqual({ zip_code: "78701" });
    expect(mockBuildCommunityData).toHaveBeenCalledWith(
      expect.objectContaining({
        seasonalSections: { things_to_do_february: "- Events" }
      })
    );
  });

  it("builds full community data", async () => {
    mockFetchCategoryPayload.mockResolvedValue({ items: [{ name: "Cafe" }] });
    mockFetchMonthlyPayload.mockResolvedValue({ items: [{ name: "Event" }] });

    const result = await getPerplexityCommunityData({
      zipCode: "78701",
      location: { city: "Austin", state: "TX", lat: 1, lng: 2 }
    });

    expect(result).toEqual({ zip_code: "78701" });
    expect(mockBuildCommunityData).toHaveBeenCalledWith(
      expect.objectContaining({
        seasonalSections: { things_to_do_february: "- Events" }
      })
    );
  });
});
