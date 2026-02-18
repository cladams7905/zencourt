import {
  loadAudienceDirectives,
  buildAudienceSummary
} from "@web/src/lib/ai/prompts/engine/audiencePrompt";
import { readPromptFile } from "@web/src/lib/ai/prompts/engine/promptFileCache";

jest.mock("@web/src/lib/ai/prompts/engine/promptFileCache", () => {
  const actual = jest.requireActual("@web/src/lib/ai/prompts/engine/promptFileCache");
  return {
    ...actual,
    readPromptFile: jest.fn(async (p: string) => `FILE:${p}`)
  };
});

describe("audiencePrompt", () => {
  it("loads directives for known audience segments", async () => {
    await expect(loadAudienceDirectives(["relocators", "first_time_homebuyers"]))
      .resolves.toContain("FILE:audience/relocators.md");
    expect(readPromptFile).toHaveBeenCalledWith("audience/relocators.md");
  });

  it("throws for unknown segment", async () => {
    await expect(loadAudienceDirectives(["unknown_segment"]))
      .rejects.toThrow("Unknown audience segment");
  });

  it("builds audience summary with conditional sections", () => {
    const source = [
      "## Relocators",
      "**Tone:** Helpful and clear",
      "**Who they are:**",
      "People moving for work.",
      "**Core pain points:**",
      "- Short timelines",
      "### Key Topics",
      "Schools and commute",
      "### Data Emphasis",
      "Pricing trends"
    ].join("\n");

    const marketSummary = buildAudienceSummary(source, "market_insights", "Need good schools");
    expect(marketSummary).toContain("Audience: Relocators");
    expect(marketSummary).toContain("Key topics:");
    expect(marketSummary).toContain("Audience description: Need good schools");

    const listingSummary = buildAudienceSummary(source, "listing", "ignored");
    expect(listingSummary).not.toContain("Audience description");
    expect(listingSummary).not.toContain("Key topics:");
  });
});
