/** @jest-environment node */

describe("content generate route", () => {
  async function loadRoute() {
    jest.resetModules();

    const mockGenerateContent = jest.fn();
    jest.doMock("@web/src/server/actions/api/content/generate", () => ({
      generateContent: (...args: unknown[]) => mockGenerateContent(...args)
    }));
    jest.doMock("@web/src/lib/core/logging/logger", () => ({
      logger: { info: jest.fn(), error: jest.fn() },
      createChildLogger: () => ({ info: jest.fn(), error: jest.fn() })
    }));

    const mod = await import("../route");
    const { ApiError } = await import("@web/src/server/utils/apiError");
    const { StatusCode } = await import("@shared/types/api");

    mockGenerateContent.mockImplementation(async (body: unknown) => {
      const b = body as { category?: unknown; agent_profile?: unknown } | null;
      if (!b?.category) {
        throw new ApiError(StatusCode.BAD_REQUEST, {
          error: "Invalid request",
          message: "category is required"
        });
      }
      if (!b.agent_profile) {
        throw new ApiError(StatusCode.BAD_REQUEST, {
          error: "Invalid request",
          message: "agent_profile is required"
        });
      }
      return new Response("ok", { status: 200 });
    });

    return {
      POST: mod.POST,
      mockGenerateContent
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

  it("calls generateContent and returns its response", async () => {
    const { POST, mockGenerateContent } = await loadRoute();
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
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "general",
        agent_profile: expect.objectContaining({
          agent_name: "Test Agent",
          brokerage_name: "Test Brokerage"
        })
      })
    );
  });

  it("returns 500 for unexpected errors", async () => {
    const { POST, mockGenerateContent } = await loadRoute();
    mockGenerateContent.mockRejectedValueOnce(new Error("boom"));
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
