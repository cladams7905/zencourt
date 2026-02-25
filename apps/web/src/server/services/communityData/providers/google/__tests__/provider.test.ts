const mockGetCommunityDataByZip = jest.fn();
const mockGetCommunityDataByZipAndAudience = jest.fn();

jest.mock("../pipeline", () => ({
  getCommunityDataByZip: (...args: unknown[]) => mockGetCommunityDataByZip(...args),
  getCommunityDataByZipAndAudience: (...args: unknown[]) =>
    mockGetCommunityDataByZipAndAudience(...args)
}));

import { createGoogleCommunityDataProvider } from "../provider";
import { CommunityDataProvider } from "@web/src/server/services/_config/community";

describe("google community provider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exposes provider id", () => {
    const provider = createGoogleCommunityDataProvider();
    expect(provider.provider).toBe(CommunityDataProvider.Google);
  });

  it("delegates getCommunityDataByZip with ordered args", async () => {
    const provider = createGoogleCommunityDataProvider();
    mockGetCommunityDataByZip.mockResolvedValueOnce({ ok: true });

    const result = await provider.getCommunityDataByZip({
      zipCode: "78701",
      serviceAreas: ["austin"],
      preferredCity: "Austin",
      preferredState: "TX",
      options: { writeCache: false }
    });

    expect(result).toEqual({ ok: true });
    expect(mockGetCommunityDataByZip).toHaveBeenCalledWith(
      "78701",
      ["austin"],
      "Austin",
      "TX",
      { writeCache: false }
    );
  });

  it("delegates getCommunityDataByZipAndAudience with ordered args", async () => {
    const provider = createGoogleCommunityDataProvider();
    mockGetCommunityDataByZipAndAudience.mockResolvedValueOnce({ ok: true });

    const result = await provider.getCommunityDataByZipAndAudience({
      zipCode: "78701",
      audienceSegment: "families",
      serviceAreas: ["austin"],
      preferredCity: "Austin",
      preferredState: "TX"
    });

    expect(result).toEqual({ ok: true });
    expect(mockGetCommunityDataByZipAndAudience).toHaveBeenCalledWith(
      "78701",
      "families",
      ["austin"],
      "Austin",
      "TX"
    );
  });
});
