const mockRequireAuthenticatedUser = jest.fn();
const mockRunContentGenerationForUser = jest.fn();

jest.mock("@web/src/server/actions/_auth/api", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/actions/content/generate/helpers", () => ({
  runContentGenerationForUser: (...args: unknown[]) =>
    (mockRunContentGenerationForUser as (...a: unknown[]) => unknown)(...args)
}));

import { generateContentForCurrentUser } from "@web/src/server/actions/content/generate/commands";
import { DomainValidationError } from "@web/src/server/errors/domain";

describe("contentGeneration commands", () => {
  const mockUser = { id: "user-1" } as never;
  const validBody = {
    category: "market_insights",
    agent_profile: {
      agent_name: "Agent",
      brokerage_name: "Brokerage",
      zip_code: "12345",
      city: "City",
      state: "ST",
      writing_tone_level: 3,
      writing_tone_label: "Conversational",
      writing_style_description: "Clear"
    },
    audience_segments: []
  };

  beforeEach(() => {
    mockRequireAuthenticatedUser.mockReset();
    mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
    mockRunContentGenerationForUser.mockReset();
    mockRunContentGenerationForUser.mockResolvedValue({
      stream: {} as ReadableStream,
      status: 200
    });
  });

  describe("generateContentForCurrentUser", () => {
    it("throws DomainValidationError when body is null", async () => {
      await expect(generateContentForCurrentUser(null)).rejects.toThrow(
        DomainValidationError
      );
      await expect(generateContentForCurrentUser(null)).rejects.toThrow(
        "category is required"
      );
      expect(mockRequireAuthenticatedUser).not.toHaveBeenCalled();
    });

    it("throws DomainValidationError when category is missing", async () => {
      await expect(
        generateContentForCurrentUser({
          ...validBody,
          category: undefined as never
        })
      ).rejects.toThrow(DomainValidationError);
      await expect(
        generateContentForCurrentUser({
          ...validBody,
          category: undefined as never
        })
      ).rejects.toThrow("category is required");

      await expect(
        generateContentForCurrentUser({ ...validBody, category: "" })
      ).rejects.toThrow("category is required");
      expect(mockRequireAuthenticatedUser).not.toHaveBeenCalled();
    });

    it("throws DomainValidationError when agent_profile is missing", async () => {
      await expect(
        generateContentForCurrentUser({
          ...validBody,
          agent_profile: undefined as never
        })
      ).rejects.toThrow(DomainValidationError);
      await expect(
        generateContentForCurrentUser({
          ...validBody,
          agent_profile: undefined as never
        })
      ).rejects.toThrow("agent_profile is required");
      expect(mockRequireAuthenticatedUser).not.toHaveBeenCalled();
    });

    it("calls requireAuthenticatedUser and runContentGenerationForUser with valid body", async () => {
      const result = await generateContentForCurrentUser(validBody);

      expect(mockRequireAuthenticatedUser).toHaveBeenCalledTimes(1);
      expect(mockRunContentGenerationForUser).toHaveBeenCalledWith(
        "user-1",
        validBody
      );
      expect(result.status).toBe(200);
      expect(result.stream).toBeDefined();
    });
  });
});
