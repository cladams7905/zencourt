import { buildPromptInput, parsePrimaryAudienceSegments } from "../promptInput";

describe("content/generate promptInput domain", () => {
  it("deduplicates audience segments", () => {
    expect(parsePrimaryAudienceSegments(["first_time", "luxury", "first_time"]))
      .toEqual(["first_time", "luxury"]);
    expect(parsePrimaryAudienceSegments(null)).toEqual([]);
  });

  it("builds enhanced prompt input with context and user profile fields", () => {
    const result = buildPromptInput({
      body: {
        category: "seasonal",
        audience_segments: [],
        content_request: null,
        agent_profile: {
          agent_name: "Body Agent",
          brokerage_name: "Body Brokerage",
          city: "Austin",
          state: "TX",
          zip_code: "78701",
          writing_tone_level: 3,
          writing_tone_label: "Conversational",
          writing_style_description: "Conversational and clear"
        }
      },
      snapshot: {
        targetAudiences: ["investors"],
        location: "Austin, TX 78701",
        writingToneLevel: 4,
        writingStyleCustom: "Avoid slang",
        agentName: "DB Agent",
        brokerageName: "DB Brokerage",
        agentBio: "Bio",
        audienceDescription: "Investors",
        county: "Travis",
        serviceAreas: ["Austin", "Round Rock"]
      },
      audienceSegments: ["investors"],
      recentHooks: ["Hook A"],
      context: {
        marketData: null,
        communityData: { seasonal_geo_sections: { jan: "events" } } as never,
        cityDescription: "City",
        communityCategoryKeys: ["parks" as never],
        seasonalExtraSections: { feb: "festivals" }
      }
    });

    expect(result.agent_profile.agent_name).toBe("DB Agent");
    expect(result.agent_profile.brokerage_name).toBe("DB Brokerage");
    expect(result.agent_profile.writing_tone_level).toBe(4);
    expect(result.agent_profile.service_areas).toBe("Austin, Round Rock");
    expect(result.audience_description).toBe("Investors");
    expect(result.recent_hooks).toEqual(["Hook A"]);
    expect(result.community_data_extra_sections).toEqual({ feb: "festivals" });
  });
});
