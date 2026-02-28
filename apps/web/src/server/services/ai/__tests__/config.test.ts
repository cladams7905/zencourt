/** @jest-environment node */

const mockGetCommunityDataProvider = jest.fn();

jest.mock("@web/src/server/services/_config/community", () => ({
  CommunityDataProvider: { Perplexity: "perplexity", Google: "google" },
  getCommunityDataProvider: (...args: unknown[]) =>
    mockGetCommunityDataProvider(...args)
}));

import { getAiUseCaseConfig } from "../config";

describe("server/services/ai/config", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("AI_")) {
        delete process.env[key];
      }
    }
    mockGetCommunityDataProvider.mockReturnValue("google");
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns defaults for content generation stream", () => {
    expect(getAiUseCaseConfig("content_generation_stream")).toEqual({
      provider: "anthropic",
      model: "claude-haiku-4-5-20251001",
      maxTokens: 2800,
      temperature: undefined,
      betaHeader: "structured-outputs-2025-11-13",
      searchContextSize: undefined
    });
  });

  it("maps city description provider from community provider fallback", () => {
    mockGetCommunityDataProvider.mockReturnValue("perplexity");

    expect(getAiUseCaseConfig("city_description").provider).toBe("perplexity");
  });

  it("applies use-case env overrides", () => {
    process.env.AI_CITY_DESCRIPTION_PROVIDER = "anthropic";
    process.env.AI_CITY_DESCRIPTION_MODEL = "custom-model";
    process.env.AI_CITY_DESCRIPTION_MAX_TOKENS = "222";

    expect(getAiUseCaseConfig("city_description")).toEqual(
      expect.objectContaining({
        provider: "anthropic",
        model: "custom-model",
        maxTokens: 222
      })
    );
  });

  it("applies global env overrides", () => {
    process.env.AI_PROVIDER = "perplexity";
    process.env.AI_MAX_TOKENS = "333";

    expect(getAiUseCaseConfig("listing_property")).toEqual(
      expect.objectContaining({
        provider: "perplexity",
        maxTokens: 333
      })
    );
  });

  it("defaults listing property search context size to high", () => {
    expect(getAiUseCaseConfig("listing_property")).toEqual(
      expect.objectContaining({
        model: "sonar-pro",
        searchContextSize: "high"
      })
    );
  });
});
