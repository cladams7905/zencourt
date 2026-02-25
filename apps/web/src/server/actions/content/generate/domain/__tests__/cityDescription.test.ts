const mockGetCachedCityDescription = jest.fn();
const mockSetCachedCityDescription = jest.fn();
const mockGenerateTextForUseCase = jest.fn();
const mockParseCityDescriptionResult = jest.fn();

jest.mock("@web/src/server/services/communityData/providers/google/cache", () => ({
  createCommunityCache: () => ({
    getCachedCityDescription: (...args: unknown[]) =>
      (mockGetCachedCityDescription as (...a: unknown[]) => unknown)(...args),
    setCachedCityDescription: (...args: unknown[]) =>
      (mockSetCachedCityDescription as (...a: unknown[]) => unknown)(...args)
  })
}));

jest.mock("@web/src/server/services/ai", () => ({
  generateTextForUseCase: (...args: unknown[]) =>
    (mockGenerateTextForUseCase as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/services/communityData/shared/cityDescription", () => ({
  buildCityDescriptionPrompt: (city: string, state: string) =>
    `prompt:${city}:${state}`,
  parseCityDescriptionResult: (...args: unknown[]) =>
    (mockParseCityDescriptionResult as (...a: unknown[]) => unknown)(...args)
}));

import { resolveCityDescription } from "@web/src/server/actions/content/generate/domain/cityDescription";

describe("contentGeneration/domain/cityDescription", () => {
  beforeEach(() => {
    mockGetCachedCityDescription.mockReset();
    mockSetCachedCityDescription.mockReset();
    mockGenerateTextForUseCase.mockReset();
    mockParseCityDescriptionResult.mockReset();
    mockGetCachedCityDescription.mockResolvedValue(null);
    mockSetCachedCityDescription.mockResolvedValue(undefined);
  });

  describe("resolveCityDescription", () => {
    it("returns null when city is missing", async () => {
      await expect(
        resolveCityDescription({ city: null, state: "TX" })
      ).resolves.toBeNull();
      await expect(
        resolveCityDescription({ city: undefined, state: "TX" })
      ).resolves.toBeNull();
      await expect(
        resolveCityDescription({ city: "", state: "TX" })
      ).resolves.toBeNull();
      expect(mockGetCachedCityDescription).not.toHaveBeenCalled();
    });

    it("returns null when state is missing", async () => {
      await expect(
        resolveCityDescription({ city: "Austin", state: null })
      ).resolves.toBeNull();
      await expect(
        resolveCityDescription({ city: "Austin", state: "" })
      ).resolves.toBeNull();
      expect(mockGetCachedCityDescription).not.toHaveBeenCalled();
    });

    it("returns cached description when cache has it", async () => {
      mockGetCachedCityDescription.mockResolvedValueOnce({
        description: "Cached city description"
      });

      const result = await resolveCityDescription({
        city: "Austin",
        state: "TX"
      });

      expect(result).toBe("Cached city description");
      expect(mockGetCachedCityDescription).toHaveBeenCalledWith("Austin", "TX");
      expect(mockGenerateTextForUseCase).not.toHaveBeenCalled();
    });

    it("calls generateTextForUseCase with city_description useCase when cache misses", async () => {
      mockGenerateTextForUseCase.mockResolvedValueOnce({
        text: '{"description":"Generated"}'
      });
      mockParseCityDescriptionResult.mockReturnValueOnce({
        description: "Generated",
        citations: null
      });

      await resolveCityDescription({ city: "Austin", state: "TX" });

      expect(mockGenerateTextForUseCase).toHaveBeenCalledWith({
        useCase: "city_description",
        system:
          "You write concise, factual city descriptions for real estate marketing prompts.",
        messages: [
          {
            role: "user",
            content: "prompt:Austin:TX"
          }
        ]
      });
    });

    it("returns null when generateTextForUseCase returns null", async () => {
      mockGenerateTextForUseCase.mockResolvedValueOnce(null);

      const result = await resolveCityDescription({
        city: "Austin",
        state: "TX"
      });

      expect(result).toBeNull();
      expect(mockParseCityDescriptionResult).not.toHaveBeenCalled();
    });

    it("returns null when parseCityDescriptionResult returns null", async () => {
      mockGenerateTextForUseCase.mockResolvedValueOnce({ text: "garbage" });
      mockParseCityDescriptionResult.mockReturnValueOnce(null);

      const result = await resolveCityDescription({
        city: "Austin",
        state: "TX"
      });

      expect(result).toBeNull();
      expect(mockSetCachedCityDescription).not.toHaveBeenCalled();
    });

    it("caches and returns parsed description when AI returns valid result", async () => {
      const aiResult = { text: '{"description":"Austin is the capital."}' };
      mockGenerateTextForUseCase.mockResolvedValueOnce(aiResult);
      mockParseCityDescriptionResult.mockReturnValueOnce({
        description: "Austin is the capital.",
        citations: null
      });

      const result = await resolveCityDescription({
        city: "Austin",
        state: "TX"
      });

      expect(result).toBe("Austin is the capital.");
      expect(mockParseCityDescriptionResult).toHaveBeenCalledWith(aiResult);
      expect(mockSetCachedCityDescription).toHaveBeenCalledWith("Austin", "TX", {
        description: "Austin is the capital.",
        citations: null
      });
    });
  });
});
