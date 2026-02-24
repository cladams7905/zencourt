import type { PromptAssemblyInput } from "@web/src/lib/ai/prompts/engine/assemble";
import type { CommunityCategoryKey } from "@web/src/server/services/contentRotation";
import type { UserAdditionalSnapshot } from "@web/src/server/actions/db/userAdditional";
import {
  buildWritingStyleDescription,
  getWritingToneLabel,
  normalizeToneLevel
} from "./tone";

export type ContentContext = {
  marketData: PromptAssemblyInput["market_data"];
  communityData: PromptAssemblyInput["community_data"];
  cityDescription: PromptAssemblyInput["city_description"];
  communityCategoryKeys: CommunityCategoryKey[] | null;
  seasonalExtraSections: Record<string, string> | null;
};

export function parsePrimaryAudienceSegments(
  targetAudiences: string[] | null
): string[] {
  if (!targetAudiences || targetAudiences.length === 0) {
    return [];
  }

  return Array.from(
    new Set(targetAudiences.map((segment) => String(segment)).filter(Boolean))
  );
}

export function buildPromptInput(args: {
  body: PromptAssemblyInput;
  snapshot: UserAdditionalSnapshot;
  audienceSegments: string[];
  recentHooks: string[];
  context: ContentContext;
}): PromptAssemblyInput {
  const { body, snapshot, audienceSegments, recentHooks, context } = args;
  const writingToneLevel = normalizeToneLevel(snapshot.writingToneLevel);

  const enhancedAgentProfile = {
    ...body.agent_profile,
    agent_name: snapshot.agentName || body.agent_profile.agent_name,
    brokerage_name: snapshot.brokerageName || body.agent_profile.brokerage_name,
    agent_bio: snapshot.agentBio ?? null,
    zip_code: body.agent_profile.zip_code,
    county: snapshot.county ?? "",
    service_areas: snapshot.serviceAreas?.join(", ") ?? "",
    writing_tone_level: writingToneLevel,
    writing_tone_label: getWritingToneLabel(writingToneLevel),
    writing_style_description: buildWritingStyleDescription(writingToneLevel, null),
    writing_style_notes: snapshot.writingStyleCustom ?? null
  };

  return {
    ...body,
    agent_profile: enhancedAgentProfile,
    audience_segments: audienceSegments,
    audience_description: snapshot.audienceDescription ?? null,
    recent_hooks: recentHooks,
    market_data: context.marketData,
    community_data: context.communityData,
    community_data_extra_sections:
      body.category === "seasonal"
        ? context.seasonalExtraSections
        : (context.communityData?.seasonal_geo_sections ?? null),
    city_description: context.cityDescription,
    community_category_keys: context.communityCategoryKeys
  };
}
