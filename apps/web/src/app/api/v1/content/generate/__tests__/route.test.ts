/** @jest-environment node */

describe("content generate route", () => {
  async function loadRoute() {
    jest.resetModules();

    const mockRequireAuthenticatedUser = jest.fn().mockResolvedValue({ id: "user-1" });
    const mockGetSharedRedisClient = jest.fn().mockReturnValue(null);
    const mockGetUserAdditionalSnapshot = jest.fn().mockResolvedValue({
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
    });
    const mockSelectRotatedAudienceSegment = jest.fn().mockResolvedValue(["buyers"]);
    const mockGetRecentHooksKey = jest.fn().mockReturnValue("recent-hooks-key");
    const mockResolveContentContext = jest.fn().mockResolvedValue({
      marketData: null,
      communityData: null,
      cityDescription: null,
      communityCategoryKeys: null,
      seasonalExtraSections: null
    });
    const mockBuildPromptInput = jest.fn().mockReturnValue({ category: "general" });
    const mockBuildSystemPrompt = jest.fn().mockResolvedValue("system prompt");
    const mockBuildUserPrompt = jest.fn().mockReturnValue("user prompt");
    const mockWritePromptLog = jest.fn().mockResolvedValue(undefined);
    const mockCreateSseResponse = jest
      .fn()
      .mockResolvedValue(new Response("ok", { status: 200 }));

    class MockApiError extends Error {
      status: number;
      body: { error: string; message: string };
      constructor(status: number, body: { error: string; message: string }) {
        super(body.message);
        this.name = "ApiError";
        this.status = status;
        this.body = body;
      }
    }

    jest.doMock("../../../_utils", () => ({
      ApiError: MockApiError,
      requireAuthenticatedUser: (...args: unknown[]) => mockRequireAuthenticatedUser(...args)
    }));
    jest.doMock("@web/src/lib/cache/redisClient", () => ({
      getSharedRedisClient: (...args: unknown[]) => mockGetSharedRedisClient(...args)
    }));
    jest.doMock("../services/userAdditional", () => ({
      getUserAdditionalSnapshot: (...args: unknown[]) => mockGetUserAdditionalSnapshot(...args)
    }));
    jest.doMock("@web/src/server/services/contentRotation", () => ({
      RECENT_HOOKS_MAX: 10,
      selectRotatedAudienceSegment: (...args: unknown[]) => mockSelectRotatedAudienceSegment(...args),
      getRecentHooksKey: (...args: unknown[]) => mockGetRecentHooksKey(...args)
    }));
    jest.doMock("../services/context", () => ({
      resolveContentContext: (...args: unknown[]) => mockResolveContentContext(...args)
    }));
    jest.doMock("../domain/promptInput", () => ({
      parsePrimaryAudienceSegments: (values: string[] | null) => values ?? [],
      buildPromptInput: (...args: unknown[]) => mockBuildPromptInput(...args)
    }));
    jest.doMock("@web/src/lib/ai/prompts/engine/assemble", () => ({
      buildSystemPrompt: (...args: unknown[]) => mockBuildSystemPrompt(...args),
      buildUserPrompt: (...args: unknown[]) => mockBuildUserPrompt(...args)
    }));
    jest.doMock("../services/promptLog", () => ({
      writePromptLog: (...args: unknown[]) => mockWritePromptLog(...args)
    }));
    jest.doMock("../services/aiStream", () => ({
      createSseResponse: (...args: unknown[]) => mockCreateSseResponse(...args)
    }));
    jest.doMock("@web/src/lib/core/logging/logger", () => ({
      logger: { info: jest.fn(), error: jest.fn() },
      createChildLogger: () => ({ info: jest.fn(), error: jest.fn() })
    }));

    const mod = await import("../route");
    return {
      POST: mod.POST,
      MockApiError,
      mockCreateSseResponse,
      mockResolveContentContext,
      mockSelectRotatedAudienceSegment,
      mockWritePromptLog
    };
  }

  it("returns 400 when category is missing", async () => {
    const { POST } = await loadRoute();
    const request = { json: async () => ({ agent_profile: {} }) } as unknown as Request;

    const response = await POST(request as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "INVALID_REQUEST",
      error: "category is required"
    });
  });

  it("returns 400 when agent_profile is missing", async () => {
    const { POST } = await loadRoute();
    const request = { json: async () => ({ category: "general" }) } as unknown as Request;

    const response = await POST(request as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "INVALID_REQUEST",
      error: "agent_profile is required"
    });
  });

  it("builds prompt and delegates SSE response", async () => {
    const { POST, mockCreateSseResponse, mockResolveContentContext, mockWritePromptLog } = await loadRoute();
    const request = {
      json: async () => ({
        category: "general",
        agent_profile: {
          agent_name: "Test Agent",
          brokerage_name: "Test Brokerage",
          city: "Austin",
          state: "TX",
          zip_code: "78701",
          writing_tone_level: 3,
          writing_tone_label: "Conversational",
          writing_style_description: "Conversational"
        }
      })
    } as unknown as Request;

    const response = await POST(request as never);

    expect(response.status).toBe(200);
    expect(mockResolveContentContext).toHaveBeenCalled();
    expect(mockWritePromptLog).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" })
    );
    expect(mockCreateSseResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: "system prompt",
        userPrompt: "user prompt"
      })
    );
  });

  it("returns 500 for unexpected errors", async () => {
    const { POST, mockResolveContentContext } = await loadRoute();
    mockResolveContentContext.mockRejectedValueOnce(new Error("boom"));
    const request = {
      json: async () => ({
        category: "general",
        agent_profile: {
          agent_name: "Test Agent",
          brokerage_name: "Test Brokerage",
          city: "Austin",
          state: "TX",
          zip_code: "78701",
          writing_tone_level: 3,
          writing_tone_label: "Conversational",
          writing_style_description: "Conversational"
        }
      })
    } as unknown as Request;

    const response = await POST(request as never);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to generate content"
    });
  });
});
