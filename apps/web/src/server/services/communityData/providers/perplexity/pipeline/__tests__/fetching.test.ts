const mockGetCategoryDisplayLimit = jest.fn();
const mockShouldIncludeServiceAreasInCache = jest.fn();
const mockGetUtcMonthKey = jest.fn();
const mockBuildCommunityCategoryPayload = jest.fn();
const mockBuildMessages = jest.fn();
const mockBuildResponseFormat = jest.fn();
const mockGetCachedCategory = jest.fn();
const mockSetCachedCategory = jest.fn();
const mockGetCachedMonthly = jest.fn();
const mockSetCachedMonthly = jest.fn();
const mockRequestPerplexity = jest.fn();

jest.mock("@web/src/server/services/_config/community", () => ({
  getCategoryDisplayLimit: (...args: unknown[]) =>
    mockGetCategoryDisplayLimit(...args),
  shouldIncludeServiceAreasInCache: (...args: unknown[]) =>
    mockShouldIncludeServiceAreasInCache(...args)
}));

jest.mock("@web/src/server/services/communityData/shared/common", () => ({
  getUtcMonthKey: (...args: unknown[]) => mockGetUtcMonthKey(...args)
}));

jest.mock(
  "@web/src/server/services/communityData/providers/perplexity/pipeline/parsing",
  () => ({
    buildCommunityCategoryPayload: (...args: unknown[]) =>
      mockBuildCommunityCategoryPayload(...args)
  })
);

jest.mock(
  "@web/src/server/services/communityData/providers/perplexity/transport/prompts",
  () => ({
    buildPerplexityCommunityMessages: (...args: unknown[]) =>
      mockBuildMessages(...args),
    getAudienceLabel: jest.fn(() => "local residents")
  })
);

jest.mock(
  "@web/src/server/services/communityData/providers/perplexity/transport/schema",
  () => ({
    buildPerplexityResponseFormat: (...args: unknown[]) =>
      mockBuildResponseFormat(...args)
  })
);

jest.mock(
  "@web/src/server/services/communityData/providers/perplexity/cache",
  () => ({
    getCachedPerplexityCategoryPayload: (...args: unknown[]) =>
      mockGetCachedCategory(...args),
    getCachedPerplexityMonthlyEventsPayload: (...args: unknown[]) =>
      mockGetCachedMonthly(...args),
    setCachedPerplexityCategoryPayload: (...args: unknown[]) =>
      mockSetCachedCategory(...args),
    setCachedPerplexityMonthlyEventsPayload: (...args: unknown[]) =>
      mockSetCachedMonthly(...args)
  })
);

jest.mock(
  "@web/src/server/services/_integrations/perplexity",
  () => ({
    requestPerplexity: (...args: unknown[]) => mockRequestPerplexity(...args)
  })
);

import {
  fetchPerplexityCategoryPayload,
  fetchPerplexityMonthlyEventsPayload,
  formatAudienceLabel
} from "@web/src/server/services/communityData/providers/perplexity/pipeline/fetching";

describe("perplexity fetching", () => {
  beforeEach(() => {
    mockGetCategoryDisplayLimit.mockReset();
    mockShouldIncludeServiceAreasInCache.mockReset();
    mockGetUtcMonthKey.mockReset();
    mockBuildCommunityCategoryPayload.mockReset();
    mockBuildMessages.mockReset();
    mockBuildResponseFormat.mockReset();
    mockGetCachedCategory.mockReset();
    mockSetCachedCategory.mockReset();
    mockGetCachedMonthly.mockReset();
    mockSetCachedMonthly.mockReset();
    mockRequestPerplexity.mockReset();

    mockGetCategoryDisplayLimit.mockReturnValue(3);
    mockShouldIncludeServiceAreasInCache.mockReturnValue(true);
    mockGetUtcMonthKey.mockReturnValue("february");
    mockBuildMessages.mockReturnValue([{ role: "user", content: "hi" }]);
    mockBuildResponseFormat.mockReturnValue({ type: "json_schema" });
    mockBuildCommunityCategoryPayload.mockReturnValue({
      items: [{ name: "Cafe" }]
    });
  });

  it("returns cached category payload when available", async () => {
    mockGetCachedCategory.mockResolvedValueOnce({
      items: [{ name: "Cached" }]
    });

    const result = await fetchPerplexityCategoryPayload({
      zipCode: "78701",
      category: "dining",
      location: { city: "Austin", state: "TX", lat: 1, lng: 2 },
      serviceAreas: ["Austin, TX"]
    });

    expect(result).toEqual({ items: [{ name: "Cached" }] });
    expect(mockRequestPerplexity).not.toHaveBeenCalled();
  });

  it("fetches and caches category payload when cache misses", async () => {
    mockGetCachedCategory.mockResolvedValueOnce(null);
    mockRequestPerplexity.mockResolvedValueOnce({
      choices: [{ message: { content: "{}" } }]
    });

    const result = await fetchPerplexityCategoryPayload({
      zipCode: "78701",
      category: "dining",
      audience: "growing_families",
      location: { city: "Austin", state: "TX", lat: 1, lng: 2 },
      serviceAreas: ["Austin, TX"],
      avoidRecommendations: ["  A  ", "", "B"]
    });

    expect(result).toEqual({ items: [{ name: "Cafe" }] });
    expect(mockBuildMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "dining",
        city: "Austin",
        state: "TX",
        zipCode: "78701",
        serviceAreas: ["Austin, TX"]
      })
    );
    expect(mockSetCachedCategory).toHaveBeenCalled();
  });

  it("bypasses category cache when forceRefresh is true", async () => {
    mockGetCachedCategory.mockResolvedValueOnce({
      items: [{ name: "Cached" }]
    });
    mockRequestPerplexity.mockResolvedValueOnce({
      choices: [{ message: { content: "{}" } }]
    });

    await fetchPerplexityCategoryPayload({
      zipCode: "78701",
      category: "dining",
      location: { city: "Austin", state: "TX", lat: 1, lng: 2 },
      forceRefresh: true
    });

    expect(mockRequestPerplexity).toHaveBeenCalled();
  });

  it("returns null when perplexity response is missing", async () => {
    mockGetCachedCategory.mockResolvedValueOnce(null);
    mockRequestPerplexity.mockResolvedValueOnce(null);

    await expect(
      fetchPerplexityCategoryPayload({
        zipCode: "78701",
        category: "dining",
        location: { city: "Austin", state: "TX", lat: 1, lng: 2 }
      })
    ).resolves.toBeNull();
  });

  it("returns cached monthly events when present", async () => {
    mockGetCachedMonthly.mockResolvedValueOnce({ items: [{ name: "Event" }] });

    const result = await fetchPerplexityMonthlyEventsPayload({
      zipCode: "78701",
      location: { city: "Austin", state: "TX", lat: 1, lng: 2 }
    });

    expect(result).toEqual({ items: [{ name: "Event" }] });
    expect(mockRequestPerplexity).not.toHaveBeenCalled();
  });

  it("fetches and caches monthly events when cache misses", async () => {
    mockGetCachedMonthly.mockResolvedValueOnce(null);
    mockRequestPerplexity.mockResolvedValueOnce({
      choices: [{ message: { content: "{}" } }]
    });

    const result = await fetchPerplexityMonthlyEventsPayload({
      zipCode: "78701",
      monthKey: "march",
      audience: "growing_families",
      location: { city: "Austin", state: "TX", lat: 1, lng: 2 }
    });

    expect(result).toEqual({ items: [{ name: "Cafe" }] });
    expect(mockBuildMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "community_events",
        extraInstructions: expect.stringContaining("March")
      })
    );
    expect(mockSetCachedMonthly).toHaveBeenCalled();
  });

  it("formats audience labels", () => {
    expect(formatAudienceLabel("growing_families")).toBe("local residents");
  });
});
