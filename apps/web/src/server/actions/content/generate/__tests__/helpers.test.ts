const mockGetSharedRedisClient = jest.fn();
const mockGetUserAdditionalSnapshot = jest.fn();
const mockSelectRotatedAudienceSegment = jest.fn();
const mockResolveContentContext = jest.fn();
const mockBuildSystemPrompt = jest.fn();
const mockBuildUserPrompt = jest.fn();
const mockWritePromptLog = jest.fn();
const mockCreateSseResponse = jest.fn();

jest.mock("@web/src/server/infra/cache/redis", () => ({
  getSharedRedisClient: () => mockGetSharedRedisClient()
}));

jest.mock("@web/src/server/models/userAdditional", () => ({
  getUserAdditionalSnapshot: (...args: unknown[]) =>
    (mockGetUserAdditionalSnapshot as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/services/contentRotation", () => {
  const actual = jest.requireActual("@web/src/server/services/contentRotation");
  return {
    ...actual,
    selectRotatedAudienceSegment: (...args: unknown[]) =>
      (mockSelectRotatedAudienceSegment as (...a: unknown[]) => unknown)(...args)
  };
});

jest.mock("@web/src/server/actions/content/generate/context", () => ({
  resolveContentContext: (...args: unknown[]) =>
    (mockResolveContentContext as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/lib/ai/prompts/engine/assemble", () => ({
  buildSystemPrompt: (...args: unknown[]) =>
    (mockBuildSystemPrompt as (...a: unknown[]) => unknown)(...args),
  buildUserPrompt: (...args: unknown[]) =>
    (mockBuildUserPrompt as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/actions/content/generate/promptLog", () => ({
  writePromptLog: (...args: unknown[]) =>
    (mockWritePromptLog as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/actions/content/generate/stream", () => ({
  createSseResponse: (...args: unknown[]) =>
    (mockCreateSseResponse as (...a: unknown[]) => unknown)(...args)
}));

import { runContentGenerationForUser } from "@web/src/server/actions/content/generate/helpers";

describe("contentGeneration helpers", () => {
  const validBody = {
    category: "market_insights",
    audience_segments: [] as string[],
    agent_profile: {
      agent_name: "Agent",
      brokerage_name: "Brokerage",
      zip_code: "12345",
      city: "City",
      state: "ST",
      writing_tone_level: 3,
      writing_tone_label: "Conversational",
      writing_style_description: "Clear"
    }
  };

  const snapshot = {
    targetAudiences: ["buyers"],
    location: "Austin, TX 78701",
    writingToneLevel: 3,
    writingStyleCustom: null,
    agentName: "Agent",
    brokerageName: "Brokerage",
    agentBio: null,
    audienceDescription: null,
    county: null,
    serviceAreas: null
  };

  const resolvedContext = {
    marketData: null,
    communityData: null,
    cityDescription: null,
    communityCategoryKeys: null,
    seasonalExtraSections: null
  };

  const mockStream = {} as ReadableStream;
  const mockRedis = {
    lrange: jest.fn().mockResolvedValue([])
  };

  beforeEach(() => {
    mockGetSharedRedisClient.mockReturnValue(mockRedis);
    mockGetUserAdditionalSnapshot.mockResolvedValue(snapshot);
    mockSelectRotatedAudienceSegment.mockResolvedValue(["buyers"]);
    mockResolveContentContext.mockResolvedValue(resolvedContext);
    mockBuildSystemPrompt.mockResolvedValue("system prompt");
    mockBuildUserPrompt.mockReturnValue("user prompt");
    mockWritePromptLog.mockResolvedValue(undefined);
    mockCreateSseResponse.mockResolvedValue({
      stream: mockStream,
      status: 200
    });
  });

  it("calls getUserAdditionalSnapshot, resolveContentContext, and createSseResponse", async () => {
    const result = await runContentGenerationForUser("user-1", validBody);

    expect(mockGetUserAdditionalSnapshot).toHaveBeenCalledWith("user-1");
    expect(mockSelectRotatedAudienceSegment).toHaveBeenCalledWith(
      mockRedis,
      "user-1",
      "market_insights",
      ["buyers"]
    );
    expect(mockResolveContentContext).toHaveBeenCalledWith({
      body: validBody,
      snapshot,
      userId: "user-1",
      redis: mockRedis,
      activeAudience: "buyers"
    });
    expect(mockBuildSystemPrompt).toHaveBeenCalled();
    expect(mockBuildUserPrompt).toHaveBeenCalled();
    expect(mockWritePromptLog).toHaveBeenCalledWith({
      userId: "user-1",
      systemPrompt: "system prompt",
      userPrompt: "user prompt"
    });
    expect(mockCreateSseResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: "system prompt",
        userPrompt: "user prompt",
        redis: mockRedis,
        logger: expect.anything()
      })
    );
    expect(result).toEqual({ stream: mockStream, status: 200 });
  });

  it("uses null activeAudience when selectRotatedAudienceSegment returns empty", async () => {
    mockSelectRotatedAudienceSegment.mockResolvedValue([]);

    await runContentGenerationForUser("user-1", validBody);

    expect(mockResolveContentContext).toHaveBeenCalledWith(
      expect.objectContaining({
        activeAudience: null
      })
    );
  });

  it("does not call redis.lrange when redis is null", async () => {
    mockGetSharedRedisClient.mockReturnValue(null);
    mockRedis.lrange.mockClear();

    await runContentGenerationForUser("user-1", validBody);

    expect(mockRedis.lrange).not.toHaveBeenCalled();
    expect(mockCreateSseResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        redis: null
      })
    );
  });
});
