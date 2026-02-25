import type { PromptAssemblyInput } from "@web/src/lib/ai/prompts/engine/assemble";
import {
  parsePrimaryAudienceSegments,
  buildPromptInput,
  type ContentContext
} from "@web/src/server/actions/contentGeneration/domain/promptInput";

describe("contentGeneration/domain/promptInput", () => {
  describe("parsePrimaryAudienceSegments", () => {
    it("returns empty array for null or empty array", () => {
      expect(parsePrimaryAudienceSegments(null)).toEqual([]);
      expect(parsePrimaryAudienceSegments([])).toEqual([]);
    });

    it("returns deduplicated non-empty segments", () => {
      expect(parsePrimaryAudienceSegments(["first-time", "first-time"])).toEqual([
        "first-time"
      ]);
      expect(parsePrimaryAudienceSegments(["a", "b", "a"])).toEqual(["a", "b"]);
    });

    it("filters out empty strings and coerces to string", () => {
      expect(parsePrimaryAudienceSegments(["ok", "", "ok"])).toEqual(["ok"]);
      expect(parsePrimaryAudienceSegments([1, 2] as never)).toEqual(["1", "2"]);
    });
  });

  describe("buildPromptInput", () => {
    const baseBody: PromptAssemblyInput = {
      category: "market_insights",
      audience_segments: [],
      agent_profile: {
        agent_name: "Body Agent",
        brokerage_name: "Body Brokerage",
        zip_code: "12345",
        city: "City",
        state: "ST",
        writing_tone_level: 3,
        writing_tone_label: "Conversational",
        writing_style_description: "Clear"
      }
    };

    const baseSnapshot = {
      targetAudiences: ["buyers"],
      location: "Austin, TX 78701",
      writingToneLevel: 4,
      writingStyleCustom: null,
      agentName: "Snapshot Agent",
      brokerageName: "Snapshot Brokerage",
      agentBio: "Bio",
      audienceDescription: "Audience desc",
      county: "Travis",
      serviceAreas: ["78701", "78702"]
    };

    const emptyContext: ContentContext = {
      marketData: null,
      communityData: null,
      cityDescription: null,
      communityCategoryKeys: null,
      seasonalExtraSections: null
    };

    it("merges body with snapshot overrides for agent profile", () => {
      const result = buildPromptInput({
        body: baseBody,
        snapshot: baseSnapshot,
        audienceSegments: ["first-time"],
        recentHooks: ["hook1"],
        context: emptyContext
      });

      expect(result.agent_profile.agent_name).toBe("Snapshot Agent");
      expect(result.agent_profile.brokerage_name).toBe("Snapshot Brokerage");
      expect(result.agent_profile.agent_bio).toBe("Bio");
      expect(result.agent_profile.county).toBe("Travis");
      expect(result.agent_profile.service_areas).toBe("78701, 78702");
      expect(result.agent_profile.writing_tone_level).toBe(4);
      expect(result.audience_segments).toEqual(["first-time"]);
      expect(result.audience_description).toBe("Audience desc");
      expect(result.recent_hooks).toEqual(["hook1"]);
      expect(result.market_data).toBeNull();
      expect(result.community_data).toBeNull();
      expect(result.city_description).toBeNull();
      expect(result.community_category_keys).toBeNull();
    });

    it("uses body agent name when snapshot agentName is empty", () => {
      const result = buildPromptInput({
        body: baseBody,
        snapshot: { ...baseSnapshot, agentName: "" },
        audienceSegments: [],
        recentHooks: [],
        context: emptyContext
      });
      expect(result.agent_profile.agent_name).toBe("Body Agent");
    });

    it("uses seasonalExtraSections for community_data_extra_sections when category is seasonal", () => {
      const context: ContentContext = {
        ...emptyContext,
        seasonalExtraSections: { events: "Events content" }
      };
      const result = buildPromptInput({
        body: { ...baseBody, category: "seasonal" },
        snapshot: baseSnapshot,
        audienceSegments: [],
        recentHooks: [],
        context
      });
      expect(result.community_data_extra_sections).toEqual({
        events: "Events content"
      });
    });

    it("uses communityData.seasonal_geo_sections for community_data_extra_sections when category is not seasonal", () => {
      const context: ContentContext = {
        ...emptyContext,
        communityData: {
          seasonal_geo_sections: { geo: "Geo content" }
        } as unknown as ContentContext["communityData"]
      };
      const result = buildPromptInput({
        body: { ...baseBody, category: "community" },
        snapshot: baseSnapshot,
        audienceSegments: [],
        recentHooks: [],
        context
      });
      expect(result.community_data_extra_sections).toEqual({ geo: "Geo content" });
    });
  });
});
