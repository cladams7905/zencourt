import { buildSystemPrompt, buildUserPrompt } from "@web/src/lib/ai/prompts/engine/assemble";
import { readPromptFile } from "@web/src/lib/ai/prompts/engine/promptFileCache";

jest.mock("@web/src/lib/ai/prompts/engine/promptFileCache", () => ({
  readPromptFile: jest.fn(async (relativePath: string) => `FILE:${relativePath}`)
}));

jest.mock("@web/src/lib/ai/prompts/engine/communityPrompt", () => ({
  buildCommunityDataPrompt: jest.fn(() => "COMMUNITY_DATA"),
  buildExtraSectionsPrompt: jest.fn(() => "EXTRA_SECTIONS")
}));

jest.mock("@web/src/lib/ai/prompts/engine/hookPrompt", () => ({
  loadHookTemplates: jest.fn(async () => ({ hookTemplates: ["Hook A", "Hook B"] })),
  formatTemplateList: jest.fn((templates: string[]) => templates.join("\n"))
}));

jest.mock("@web/src/lib/ai/prompts/engine/audiencePrompt", () => ({
  loadAudienceDirectives: jest.fn(async () => "AUDIENCE_DIRECTIVE"),
  buildAudienceSummary: jest.fn(() => "<audience_summary>ok</audience_summary>")
}));

jest.mock("@web/src/lib/ai/prompts/engine/dataPrompt", () => ({
  buildMarketDataXml: jest.fn(() => "<market_data>xml</market_data>"),
  buildListingDataXml: jest.fn(() => "<listing_data>json</listing_data>"),
  loadListingSubcategoryDirective: jest.fn(async () => "LISTING_DIRECTIVE")
}));

jest.mock("@web/src/lib/ai/prompts/engine/seasonalPrompt", () => ({
  buildTimeOfYearNote: jest.fn(() => "TIME_NOTE")
}));

const baseInput = {
  audience_segments: ["relocators"],
  category: "listing",
  agent_profile: {
    agent_name: "Alex Agent",
    brokerage_name: "Zencourt",
    city: "Austin",
    state: "TX",
    zip_code: "78701",
    writing_tone_level: 3,
    writing_tone_label: "Balanced",
    writing_style_description: "Balanced",
    writing_style_notes: null,
    agent_bio: null
  },
  content_request: {
    media_type: "video",
    platform: "instagram",
    content_type: "social_post",
    focus: "Kitchen",
    notes: "Highlight upgrades"
  },
  listing_subcategory: "new_listing",
  listing_property_details: { beds: 3 },
  recent_hooks: ["h1", "h2"]
} as const;

describe("assemble", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds listing system prompt using reorganized template/requirements paths", async () => {
    const prompt = await buildSystemPrompt(baseInput as never);

    expect(prompt).toContain("<listing_subcategory_directives>");
    expect(prompt).toContain("<text_overlay_templates>");
    expect(prompt).toContain("<listing_data>json</listing_data>");

    expect(readPromptFile).toHaveBeenCalledWith("basePrompts/listing-base-prompt.md");
    expect(readPromptFile).toHaveBeenCalledWith("templates/agent-profile.md");
    expect(readPromptFile).toHaveBeenCalledWith("templates/community-data.md");
    expect(readPromptFile).toHaveBeenCalledWith("requirements/compliance-quality.md");
    expect(readPromptFile).toHaveBeenCalledWith("requirements/output-requirements.md");
    expect(readPromptFile).toHaveBeenCalledWith("requirements/output-requirements-video.md");
    expect(readPromptFile).toHaveBeenCalledWith("textOverlayTemplates/video.md");
  });

  it("builds non-listing user prompt with audience line", () => {
    const prompt = buildUserPrompt({
      ...baseInput,
      category: "market_insights",
      listing_subcategory: null
    } as never);

    expect(prompt).toContain("**Audience Segments:** relocators");
    expect(prompt).toContain("**Media Type:** video");
  });

  it("omits audience line for listing user prompt", () => {
    const prompt = buildUserPrompt(baseInput as never);
    expect(prompt).not.toContain("Audience Segments");
    expect(prompt).toContain("**Listing Subcategory:** new_listing");
  });
});
