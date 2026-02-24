/** @jest-environment node */
export {};

describe("content generate route", () => {
  async function loadRoute() {
    jest.resetModules();

    const mockRequireAuthenticatedUser = jest
      .fn()
      .mockResolvedValue({ id: "user-1" });
    const mockRunContentGeneration = jest.fn();

    jest.doMock("@web/src/server/utils/apiAuth", () => ({
      requireAuthenticatedUser: (...args: unknown[]) =>
        mockRequireAuthenticatedUser(...args)
    }));
    jest.doMock("@web/src/server/services/contentGeneration", () => ({
      runContentGeneration: (...args: unknown[]) =>
        mockRunContentGeneration(...args)
    }));
    jest.doMock("@web/src/lib/core/logging/logger", () => ({
      logger: { info: jest.fn(), error: jest.fn() },
      createChildLogger: () => ({ info: jest.fn(), error: jest.fn() })
    }));

    const mod = await import("../route");
    return {
      POST: mod.POST,
      mockRequireAuthenticatedUser,
      mockRunContentGeneration
    };
  }

  it("returns 400 when category is missing", async () => {
    const { POST } = await loadRoute();
    const request = { json: async () => ({ agent_profile: {} }) } as Request;

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
    const request = { json: async () => ({ category: "general" }) } as Request;

    const response = await POST(request as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "INVALID_REQUEST",
      error: "agent_profile is required"
    });
  });

  it("calls service and returns SSE response", async () => {
    const { POST, mockRequireAuthenticatedUser, mockRunContentGeneration } =
      await loadRoute();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("ok"));
        controller.close();
      }
    });
    mockRunContentGeneration.mockResolvedValueOnce({ stream, status: 200 });

    const body = {
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
    };
    const request = { json: async () => body } as Request;

    const response = await POST(request as never);

    expect(response.status).toBe(200);
    expect(mockRequireAuthenticatedUser).toHaveBeenCalledTimes(1);
    expect(mockRunContentGeneration).toHaveBeenCalledWith("user-1", body);
  });

  it("returns 500 for unexpected errors", async () => {
    const { POST, mockRunContentGeneration } = await loadRoute();
    mockRunContentGeneration.mockRejectedValueOnce(new Error("boom"));

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
    } as Request;

    const response = await POST(request as never);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to generate content"
    });
  });
});
