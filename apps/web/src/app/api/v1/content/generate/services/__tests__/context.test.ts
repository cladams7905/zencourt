/** @jest-environment node */

const mockParseMarketLocation = jest.fn();
const mockGetMarketData = jest.fn();
const mockGetCommunityContentContext = jest.fn();

jest.mock("../../../../_utils", () => ({
  ApiError: class extends Error {
    status: number;
    body: { error: string; message: string };
    constructor(status: number, body: { error: string; message: string }) {
      super(body.message);
      this.status = status;
      this.body = body;
    }
  }
}));
jest.mock("../marketLocation", () => ({
  parseMarketLocation: (...args: unknown[]) => mockParseMarketLocation(...args)
}));
jest.mock("@web/src/server/services/marketData", () => ({
  getMarketData: (...args: unknown[]) => mockGetMarketData(...args)
}));
jest.mock("@web/src/server/services/communityData/service", () => ({
  getCommunityContentContext: (...args: unknown[]) => mockGetCommunityContentContext(...args)
}));

import { resolveContentContext } from "../context";

describe("content/generate services/context", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws 400 when market_insights has no valid market location", async () => {
    mockParseMarketLocation.mockReturnValue(null);

    await expect(
      resolveContentContext({
        body: { category: "market_insights" } as never,
        snapshot: { location: null, serviceAreas: null } as never,
        userId: "user-1",
        redis: null,
        activeAudience: null
      })
    ).rejects.toMatchObject({
      status: 400,
      body: { error: "Missing market location" }
    });
  });

  it("throws 500 when market data provider returns null", async () => {
    mockParseMarketLocation.mockReturnValue({ city: "Austin", state: "TX", zip_code: "78701" });
    mockGetMarketData.mockResolvedValue(null);

    await expect(
      resolveContentContext({
        body: { category: "market_insights" } as never,
        snapshot: { location: "Austin, TX 78701", serviceAreas: null } as never,
        userId: "user-1",
        redis: null,
        activeAudience: null
      })
    ).rejects.toMatchObject({
      status: 500,
      body: { error: "Market data unavailable" }
    });
  });

  it("returns market data context for market_insights", async () => {
    mockParseMarketLocation.mockReturnValue({ city: "Austin", state: "TX", zip_code: "78701" });
    mockGetMarketData.mockResolvedValue({ median_home_price: "$500k" });

    const result = await resolveContentContext({
      body: { category: "market_insights" } as never,
      snapshot: { location: "Austin, TX 78701", serviceAreas: null } as never,
      userId: "user-1",
      redis: null,
      activeAudience: null
    });

    expect(result.marketData).toEqual({ median_home_price: "$500k" });
    expect(result.communityData).toBeNull();
    expect(mockGetCommunityContentContext).not.toHaveBeenCalled();
  });

  it("returns community context for seasonal/community categories", async () => {
    mockParseMarketLocation.mockReturnValue({ city: "Austin", state: "TX", zip_code: "78701" });
    mockGetCommunityContentContext.mockResolvedValue({
      communityData: { seasonal_geo_sections: { jan: "events" } },
      cityDescription: "A vibrant city",
      communityCategoryKeys: ["dining"],
      seasonalExtraSections: { feb: "festivals" }
    });

    const result = await resolveContentContext({
      body: { category: "seasonal" } as never,
      snapshot: { location: "Austin, TX 78701", serviceAreas: ["Austin"] } as never,
      userId: "user-1",
      redis: null,
      activeAudience: "buyers"
    });

    expect(mockGetCommunityContentContext).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "seasonal",
        zipCode: "78701",
        audienceSegment: "buyers"
      })
    );
    expect(result).toMatchObject({
      cityDescription: "A vibrant city",
      communityCategoryKeys: ["dining"],
      seasonalExtraSections: { feb: "festivals" }
    });
  });
});
