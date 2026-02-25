/** @jest-environment node */
export {};

describe("content generate route", () => {
  async function loadRoute() {
    jest.resetModules();

    const mockGenerateContentForCurrentUser = jest.fn();
    const MockDomainError = class extends Error {
      kind: string;
      constructor(kind: string, message: string) {
        super(message);
        this.kind = kind;
      }
    };
    jest.doMock("@web/src/server/actions/_auth/api", () => ({
      requireAuthenticatedUser: jest.fn()
    }));
    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      DomainError: MockDomainError,
      mapDomainError: () => ({ status: 400, code: "INVALID_REQUEST" })
    }));
    jest.doMock("@web/src/server/actions/content/generate/commands", () => ({
      generateContentForCurrentUser: (...args: unknown[]) =>
        mockGenerateContentForCurrentUser(...args)
    }));
    jest.doMock("@web/src/lib/core/logging/logger", () => ({
      logger: { info: jest.fn(), error: jest.fn() },
      createChildLogger: () => ({ info: jest.fn(), error: jest.fn() })
    }));

    const mod = await import("../route");
    return {
      POST: mod.POST,
      mockGenerateContentForCurrentUser,
      MockDomainError
    };
  }

  it("calls service and returns SSE response", async () => {
    const { POST, mockGenerateContentForCurrentUser } =
      await loadRoute();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("ok"));
        controller.close();
      }
    });
    mockGenerateContentForCurrentUser.mockResolvedValueOnce({ stream, status: 200 });

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
    expect(mockGenerateContentForCurrentUser).toHaveBeenCalledWith(body);
  });

  it("returns 500 for unexpected errors", async () => {
    const { POST, mockGenerateContentForCurrentUser } = await loadRoute();
    mockGenerateContentForCurrentUser.mockRejectedValueOnce(new Error("boom"));

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

  it("returns 500 for non-Error throw values", async () => {
    const { POST, mockGenerateContentForCurrentUser } = await loadRoute();
    mockGenerateContentForCurrentUser.mockRejectedValueOnce("nope");

    const request = {
      json: async () => ({ category: "general", agent_profile: {} })
    } as Request;
    const response = await POST(request as never);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to generate content"
    });
  });

  it("maps DomainError to api error response", async () => {
    const { POST, mockGenerateContentForCurrentUser, MockDomainError } =
      await loadRoute();
    mockGenerateContentForCurrentUser.mockRejectedValueOnce(
      new MockDomainError("validation", "invalid payload")
    );

    const request = {
      json: async () => ({ category: "general", agent_profile: {} })
    } as Request;
    const response = await POST(request as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "INVALID_REQUEST",
      error: "invalid payload"
    });
  });
});
