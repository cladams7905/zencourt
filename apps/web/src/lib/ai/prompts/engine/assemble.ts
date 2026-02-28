import { readPromptFile } from "./promptFileCache";
import { interpolateTemplate, resolveContentMediaType } from "./promptHelpers";
import { buildCommunityDataPrompt, buildExtraSectionsPrompt } from "./communityPrompt";
import { loadHookTemplates, formatTemplateList } from "./hookPrompt";
import { loadAudienceDirectives, buildAudienceSummary } from "./audiencePrompt";
import {
  buildMarketDataXml,
  buildListingDataXml,
  buildOpenHouseContextXml,
  loadListingSubcategoryDirective
} from "./dataPrompt";
import { buildTimeOfYearNote } from "./seasonalPrompt";
import type { PromptAssemblyInput } from "./types";

export type {
  AgentProfileInput,
  MarketDataInput,
  CommunityDataInput,
  ContentRequestInput,
  PromptAssemblyInput
} from "./types";

const RECENT_HOOK_LIMIT = 4;

export async function buildSystemPrompt(input: PromptAssemblyInput) {
  const mediaType = resolveContentMediaType(input.content_request);
  const basePromptFile =
    input.category === "community"
      ? "basePrompts/community-base-prompt.md"
      : input.category === "market_insights"
        ? "basePrompts/market-insights-base-prompt.md"
        : input.category === "educational"
          ? "basePrompts/educational-base-prompt.md"
        : input.category === "lifestyle"
            ? "basePrompts/lifestyle-base-prompt.md"
            : input.category === "seasonal"
              ? "basePrompts/seasonal-base-prompt.md"
              : input.category === "listing"
                ? "basePrompts/listing-base-prompt.md"
            : "basePrompts/base-prompt.md";
  const baseSystemPrompt = await readPromptFile(basePromptFile);
  const audienceDirective =
    input.category === "listing"
      ? ""
      : await loadAudienceDirectives(input.audience_segments);
  const audienceSummary = audienceDirective
    ? buildAudienceSummary(
        audienceDirective,
        input.category,
        input.audience_description
      )
    : "";
  const { hookTemplates } = await loadHookTemplates(input);
  const agentTemplate = await readPromptFile("templates/agent-profile.md");
  const communityTemplate = await readPromptFile("templates/community-data.md");
  const complianceQuality = await readPromptFile(
    "requirements/compliance-quality.md"
  );
  const outputRequirementsShared = await readPromptFile(
    "requirements/output-requirements.md"
  );
  const outputRequirementsMedia = await readPromptFile(
    mediaType === "video"
      ? "requirements/output-requirements-video.md"
      : "requirements/output-requirements-image.md"
  );
  const textOverlayTemplates =
    input.category === "listing"
      ? await readPromptFile(
          mediaType === "video"
            ? "textOverlayTemplates/video.md"
            : "textOverlayTemplates/image.md"
        )
      : "";

  const styleNotes = input.agent_profile.writing_style_notes?.trim();
  const styleNotesBlock = styleNotes
    ? `Additional style notes (must follow): ${styleNotes}`
    : "";
  const agentBio = input.agent_profile.agent_bio?.trim();
  const agentBioBlock = agentBio ? `\n## Bio\n${agentBio}` : "";
  const normalizedToneLabel = input.agent_profile.writing_style_description?.trim();
  const toneLabel = input.agent_profile.writing_tone_label?.trim();
  const writingStyleDescription =
    normalizedToneLabel && toneLabel && normalizedToneLabel === toneLabel
      ? ""
      : input.agent_profile.writing_style_description;
  const agentProfileValues = {
    ...input.agent_profile,
    writing_style_description: writingStyleDescription ?? "",
    writing_style_notes_block: styleNotesBlock,
    agent_bio_block: agentBioBlock,
    area_description: input.city_description?.trim() ?? "",
    time_of_year: buildTimeOfYearNote()
  };
  const agentProfile = interpolateTemplate(agentTemplate, agentProfileValues);
  const marketData = input.market_data
    ? buildMarketDataXml(input.market_data)
    : "";
  const communityData = input.community_data
    ? buildCommunityDataPrompt(
        input.community_data,
        communityTemplate,
        input.community_category_keys,
        input.community_data_extra_sections
      )
    : "";

  const marketBlock =
    input.category === "market_insights" && marketData
      ? `\n\n${marketData}`
      : "";
  const communityBlock =
    input.category === "community" && communityData
      ? `\n\n<community_data>\n${communityData}\n</community_data>`
      : "";
  const seasonalExtras = buildExtraSectionsPrompt(
    input.category === "seasonal" ? input.community_data_extra_sections : null
  );
  const seasonalBlock =
    input.category === "seasonal" && seasonalExtras
      ? `\n\n<seasonal_data>\n${seasonalExtras}\n</seasonal_data>`
      : "";
  const recentHooks = input.recent_hooks?.slice(0, RECENT_HOOK_LIMIT) ?? [];
  const recentHooksBlock =
    recentHooks.length > 0
      ? `\n\n<recent_hooks>\nDo NOT reuse or closely paraphrase any of these hooks:\n- ${recentHooks.join(
          "\n- "
        )}\n</recent_hooks>`
      : "";
  const listingSubcategoryDirective =
    input.category === "listing"
      ? await loadListingSubcategoryDirective(input.listing_subcategory)
      : "";
  const listingSubcategoryBlock =
    input.category === "listing" && listingSubcategoryDirective
      ? `\n\n<listing_subcategory_directives>\n${listingSubcategoryDirective}\n</listing_subcategory_directives>`
      : "";
  const listingDataBlock =
    input.category === "listing"
      ? `\n\n${buildListingDataXml(input.listing_property_details)}`
      : "";
  const openHouseContextBlock =
    input.category === "listing" &&
    input.listing_subcategory === "open_house" &&
    input.listing_open_house_context
      ? `\n\n${buildOpenHouseContextXml(input.listing_open_house_context)}`
      : "";
  const textOverlayTemplatesBlock =
    input.category === "listing" && textOverlayTemplates
      ? `\n\n<text_overlay_templates>\n${textOverlayTemplates}\n</text_overlay_templates>`
      : "";

  return `
${baseSystemPrompt}

${agentProfile}

${audienceSummary}

<hooks>
Pick one hook template per item and adapt it with specifics from the context provided.
<hook_templates>
${formatTemplateList(hookTemplates)}
</hook_templates>
</hooks>

${recentHooksBlock}${marketBlock}${communityBlock}${seasonalBlock}${listingSubcategoryBlock}${listingDataBlock}${openHouseContextBlock}${textOverlayTemplatesBlock}

${complianceQuality}

${outputRequirementsShared}

${outputRequirementsMedia}
`.trim();
}

export function buildUserPrompt(input: PromptAssemblyInput): string {
  const { content_request, category, audience_segments } = input;
  const platform = content_request?.platform ?? "instagram";
  const contentType = content_request?.content_type ?? "social_post";
  const mediaType = resolveContentMediaType(content_request);
  const focus = content_request?.focus ?? "";
  const notes = content_request?.notes ?? "";
  const generationCount =
    typeof content_request?.generation_count === "number"
      ? Math.max(1, Math.floor(content_request.generation_count))
      : 4;
  const templateId = content_request?.template_id?.trim() ?? "";
  const audienceLine =
    category === "listing"
      ? ""
      : `- **Audience Segments:** ${audience_segments.join(", ") || "general"}\n`;
  return `
<content_request>
- **Category:** ${category}
${audienceLine}- **Platform:** ${platform}
- **Content Type:** ${contentType}
- **Media Type:** ${mediaType}
- **Focus:** ${focus || "No additional focus"}
- **Notes:** ${notes || "None"}
- **Requested Item Count:** ${generationCount}
- **Template ID:** ${templateId || "None"}
- **Listing Subcategory:** ${input.listing_subcategory ?? "None"}
</content_request>

<generation_rules>
- Return a JSON array of exactly ${generationCount} item(s).
- Treat this item count as mandatory.
${templateId ? `- Use template_id "${templateId}" for every generated item.` : ""}
</generation_rules>
`.trim();
}
