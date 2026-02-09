import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CommunityData, MarketData } from "@web/src/types/market";
import type {
  ListingContentSubcategory,
  ListingPropertyDetails
} from "@shared/types/models";

type PromptValues = Record<string, string | number | null | undefined>;

export type AgentProfileInput = {
  agent_name: string;
  brokerage_name: string;
  agent_title?: string | null;
  agent_bio?: string | null;
  city: string;
  state: string;
  zip_code: string;
  county?: string | null;
  service_areas?: string | null;
  writing_tone_level: number;
  writing_tone_label: string;
  writing_style_description: string;
  writing_style_notes?: string | null;
};

export type MarketDataInput = MarketData;
export type CommunityDataInput = CommunityData;

export type ContentRequestInput = {
  platform?: string | null;
  content_type?: string | null;
  focus?: string | null;
  notes?: string | null;
};

export type PromptAssemblyInput = {
  audience_segments: string[];
  category: string;
  agent_profile: AgentProfileInput;
  audience_description?: string | null;
  market_data?: MarketDataInput | null;
  community_data?: CommunityDataInput | null;
  city_description?: string | null;
  community_category_keys?: string[] | null;
  community_data_extra_sections?: Record<string, string> | null;
  listing_subcategory?: ListingContentSubcategory | null;
  listing_property_details?: ListingPropertyDetails | null;
  content_request?: ContentRequestInput | null;
  recent_hooks?: string[] | null;
};

const DEFAULT_PROMPTS_ROOT = path.join(process.cwd(), "src/lib/prompts");
const FALLBACK_PROMPTS_ROOT = path.join(
  process.cwd(),
  "apps/web/src/lib/prompts"
);
const PROMPTS_ROOT = existsSync(DEFAULT_PROMPTS_ROOT)
  ? DEFAULT_PROMPTS_ROOT
  : FALLBACK_PROMPTS_ROOT;

const promptCache = new Map<string, string>();

const AUDIENCE_FILES: Record<string, string> = {
  first_time_homebuyers: "audience/first-time-homebuyers.md",
  first_time_buyers: "audience/first-time-homebuyers.md",
  growing_families: "audience/growing-families.md",
  downsizers_retirees: "audience/downsizers-retirees.md",
  vacation_property_buyers: "audience/vacation-property-buyers.md",
  military_veterans: "audience/military-veterans.md",
  real_estate_investors: "audience/real-estate-investors.md",
  luxury_homebuyers: "audience/luxury-homebuyers.md",
  relocators: "audience/relocators.md",
  job_transferees: "audience/relocators.md"
};

const CATEGORY_HOOK_FILES: Record<string, string> = {
  educational: "hooks/educational-hooks.md",
  market_insights: "hooks/market-insights-hooks.md",
  community: "hooks/community-hooks.md",
  listing: "hooks/listing-hooks.md",
  lifestyle: "hooks/lifestyle-hooks.md",
  seasonal: "hooks/seasonal_hooks.md"
};

const LISTING_SUBCATEGORY_DIRECTIVE_FILES: Record<
  ListingContentSubcategory,
  string
> = {
  new_listing: "listingSubcategories/new-listing.md",
  open_house: "listingSubcategories/open-house.md",
  price_change: "listingSubcategories/price-change.md",
  status_update: "listingSubcategories/status-update.md",
  property_features: "listingSubcategories/property-features.md"
};

const LISTING_SUBCATEGORY_HOOK_FILES: Record<ListingContentSubcategory, string> =
  {
    new_listing: "hooks/listing-new-listing-hooks.md",
    open_house: "hooks/listing-open-house-hooks.md",
    price_change: "hooks/listing-price-change-hooks.md",
    status_update: "hooks/listing-status-update-hooks.md",
    property_features: "hooks/listing-property-features-hooks.md"
  };

const HOOK_WORD_MIN = 3;
const HOOK_WORD_MAX = 10;
const HOOK_SAMPLE_COUNT = 10;

async function readPromptFile(relativePath: string): Promise<string> {
  if (promptCache.has(relativePath)) {
    return promptCache.get(relativePath)!;
  }

  const fullPath = path.join(PROMPTS_ROOT, relativePath);
  const content = await readFile(fullPath, "utf8");
  promptCache.set(relativePath, content);
  return content;
}

const COMMUNITY_DATA_DEFAULT = "- (none found)";

type CommunityTemplateSection = {
  key: string | null;
  lines: string[];
};

function parseCommunityTemplate(template: string): {
  header: string[];
  sections: CommunityTemplateSection[];
} {
  const lines = template.split("\n");
  const header: string[] = [];
  const sections: CommunityTemplateSection[] = [];
  let current: CommunityTemplateSection | null = null;
  let hasSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const isLabel = trimmed.endsWith(":") && trimmed.length > 1;
    if (isLabel) {
      hasSection = true;
      if (current) {
        sections.push(current);
      }
      current = { key: null, lines: [line] };
      continue;
    }

    if (!hasSection) {
      header.push(line);
      continue;
    }

    if (!current) {
      current = { key: null, lines: [] };
    }

    current.lines.push(line);
    if (!current.key) {
      const match = line.match(/\{([a-zA-Z0-9_]+)\}/);
      if (match?.[1]) {
        current.key = match[1];
      }
    }
  }

  if (current) {
    sections.push(current);
  }

  return { header, sections };
}

function buildCommunityDataPrompt(
  communityData: CommunityDataInput,
  template: string,
  selectedKeys?: string[] | null,
  extraSections?: Record<string, string> | null
): string {
  const values: PromptValues = {};
  for (const [key, value] of Object.entries(communityData)) {
    if (typeof value === "string" && hasMeaningfulValue(value)) {
      values[key] = value;
    } else {
      values[key] = COMMUNITY_DATA_DEFAULT;
    }
  }

  const { header, sections } = parseCommunityTemplate(template);
  const templateKeys = new Set(
    sections.map((section) => section.key).filter(Boolean) as string[]
  );
  const allowed = selectedKeys ? new Set<string>(selectedKeys) : null;
  const parts: string[] = [];

  if (header.length > 0) {
    parts.push(header.join("\n"));
  }

  for (const section of sections) {
    if (allowed && section.key && !allowed.has(section.key)) {
      continue;
    }
    parts.push(interpolateTemplate(section.lines.join("\n"), values));
  }

  const extraEntries = extraSections
    ? Object.entries(extraSections).filter(
        ([, value]) => hasMeaningfulValue(value)
      )
    : [];
  const extraMap = new Map(extraEntries);
  const extraKeys = selectedKeys
    ? selectedKeys.filter((key) => !templateKeys.has(key))
    : extraEntries.map(([key]) => key);

  for (const key of extraKeys) {
    const value = extraMap.get(key);
    if (!value) {
      continue;
    }
    parts.push(`${key}:\n${value}`);
  }

  return parts.join("\n").trim();
}

function buildExtraSectionsPrompt(
  extraSections?: Record<string, string> | null
): string {
  const entries = extraSections
    ? Object.entries(extraSections).filter(([, value]) =>
        hasMeaningfulValue(value)
      )
    : [];

  return entries.map(([key, value]) => `${key}:\n${value}`).join("\n");
}

function countTemplateWords(template: string): number {
  const normalized = template
    .replace(/[{}]/g, "")
    .replace(/[$]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return 0;
  }

  return normalized.split(" ").length;
}

function extractTemplateLines(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function uniqueTemplates(templates: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const template of templates) {
    const normalized = template.replace(/\s+/g, " ").trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }

  return result;
}

function sampleTemplates(templates: string[], count: number): string[] {
  if (templates.length <= count) {
    return templates;
  }

  const shuffled = [...templates];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

function formatTemplateList(templates: string[]): string {
  if (templates.length === 0) {
    return "- (none available)";
  }
  return `- ${templates.join("\n- ")}`;
}

function cleanSummaryText(value: string): string {
  return value.replace(/—/g, ",").replace(/\s+/g, " ").trim();
}

function extractSectionText(
  lines: string[],
  heading: string
): string | null {
  const headingIndex = lines.findIndex((line) => line.trim() === heading);
  if (headingIndex === -1) {
    return null;
  }

  const collected: string[] = [];
  for (let i = headingIndex + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) {
      if (collected.length > 0) {
        break;
      }
      continue;
    }
    if (line.startsWith("### ") || line.startsWith("## ")) {
      break;
    }
    if (line.startsWith("<")) {
      break;
    }
    collected.push(line);
  }

  if (collected.length === 0) {
    return null;
  }

  return cleanSummaryText(collected.join(" "));
}

function extractBulletSection(
  lines: string[],
  marker: string
): string[] {
  const markerIndex = lines.findIndex((line) =>
    line.trim().startsWith(marker)
  );
  if (markerIndex === -1) {
    return [];
  }

  const bullets: string[] = [];
  for (let i = markerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) {
      if (bullets.length > 0) {
        break;
      }
      continue;
    }
    if (!line.startsWith("- ")) {
      break;
    }
    bullets.push(cleanSummaryText(line.slice(2)));
  }

  return bullets;
}

function buildAudienceSummary(
  content: string,
  category?: string,
  audienceDescription?: string | null
): string {
  const lines = content.split("\n");
  const titleMatch = content.match(/^##\s+(.+)$/m);
  const toneMatch = content.match(/^\*\*Tone:\*\*\s*(.+)$/m);
  const whoTheyAre = extractSectionText(lines, "**Who they are:**");
  const corePainPoints = extractBulletSection(lines, "**Core pain points:**");
  const keyTopics = extractSectionText(lines, "### Key Topics");
  const dataEmphasis = extractSectionText(lines, "### Data Emphasis");

  const summaryParts: string[] = [];
  if (titleMatch?.[1]) {
    summaryParts.push(`Audience: ${titleMatch[1].trim()}`);
  }
  if (whoTheyAre) {
    summaryParts.push(`Who they are: ${whoTheyAre}`);
  }
  if (toneMatch?.[1]) {
    summaryParts.push(`Tone: ${cleanSummaryText(toneMatch[1])}`);
  }
  if (corePainPoints.length > 0) {
    summaryParts.push(
      `Core pain points:\n- ${corePainPoints.join("\n- ")}`
    );
  }
  const includeTopics =
    category !== "community" &&
    category !== "lifestyle" &&
    category !== "seasonal";
  if (includeTopics && keyTopics) {
    summaryParts.push(`Key topics: ${keyTopics}`);
  }
  if (includeTopics && dataEmphasis) {
    summaryParts.push(`Data emphasis: ${dataEmphasis}`);
  }
  if (audienceDescription && audienceDescription.trim()) {
    summaryParts.push(`Audience description: ${audienceDescription.trim()}`);
  }

  return summaryParts.length > 0
    ? `<audience_summary>\n${summaryParts.join("\n")}\n</audience_summary>`
    : "";
}

function hasMeaningfulValue(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  const normalized = trimmed.toLowerCase();
  return normalized !== "n/a" && normalized !== "na" && normalized !== "null";
}

function buildMarketDataXml(data: MarketDataInput): string {
  const location = `${data.city}, ${data.state}`;
  const fields: Array<[string, string | null | undefined]> = [
    ["summary", data.market_summary],
    ["median_home_price", data.median_home_price],
    ["price_change_yoy", data.price_change_yoy],
    ["active_listings", data.active_listings],
    ["months_of_supply", data.months_of_supply],
    ["avg_dom", data.avg_dom],
    ["sale_to_list_ratio", data.sale_to_list_ratio],
    ["median_rent", data.median_rent],
    ["rent_change_yoy", data.rent_change_yoy],
    ["rate_30yr", data.rate_30yr],
    ["estimated_monthly_payment", data.estimated_monthly_payment],
    ["median_household_income", data.median_household_income],
    ["affordability_index", data.affordability_index],
    ["entry_level_price", data.entry_level_price],
    ["entry_level_payment", data.entry_level_payment]
  ];

  const lines = fields
    .filter(([, value]) => hasMeaningfulValue(value))
    .map(([key, value]) => `${key}: ${value}`);

  return [
    `<market_data location="${location}" zip_code="${data.zip_code}" as_of="${data.data_timestamp}">`,
    ...lines,
    "</market_data>"
  ].join("\n");
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const MONTH_TOPIC_HINTS = [
  "winter-related topics, New Year's resolutions, and cold-weather lifestyle",
  "winter living, Valentine's season, and cozy indoor activities",
  "early spring energy, St. Patrick's Day, and spring prep",
  "spring blooms, Easter season, and tax season",
  "peak spring, Memorial Day, and early summer planning",
  "summer kick-off and outdoor living",
  "summer events, Fourth of July, and backyard entertaining",
  "late-summer living, back-to-school, and end-of-summer prep",
  "early fall, Labor Day, and fall market momentum",
  "autumn leaves, Halloween, pumpkin spice, and cozy home themes",
  "Thanksgiving season, gratitude, and holiday hosting",
  "holiday season, year-end reflections, Christmas, and winter comfort"
];

function buildTimeOfYearNote(now = new Date()): string {
  const monthIndex = now.getMonth();
  const monthName = MONTH_NAMES[monthIndex] ?? "this month";
  const year = now.getFullYear();
  const topicHint =
    MONTH_TOPIC_HINTS[monthIndex] ?? "seasonal topics and local events";
  return `Right now it is ${monthName} ${year}, so focus on ${topicHint}.`;
}

function interpolateTemplate(template: string, values: PromptValues): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    const value = values[key];
    if (value === null || value === undefined) {
      return match;
    }
    return String(value);
  });
}

async function loadAudienceDirectives(segments: string[]): Promise<string> {
  if (!segments.length) {
    return "";
  }

  const directives = await Promise.all(
    segments.map(async (segment) => {
      const file = AUDIENCE_FILES[segment];
      if (!file) {
        throw new Error(`Unknown audience segment: ${segment}`);
      }
      return readPromptFile(file);
    })
  );

  return directives.join("\n\n");
}

function normalizeListingSubcategory(
  subcategory?: string | null
): ListingContentSubcategory | null {
  if (!subcategory) {
    return null;
  }
  return subcategory in LISTING_SUBCATEGORY_HOOK_FILES
    ? (subcategory as ListingContentSubcategory)
    : null;
}

async function loadListingSubcategoryDirective(
  subcategory?: string | null
): Promise<string> {
  const normalized = normalizeListingSubcategory(subcategory);
  if (!normalized) {
    return "";
  }

  const file = LISTING_SUBCATEGORY_DIRECTIVE_FILES[normalized];
  return readPromptFile(file);
}

function buildListingDataXml(
  listingPropertyDetails?: ListingPropertyDetails | null
): string {
  if (!listingPropertyDetails) {
    return [
      "<listing_data>",
      "No structured listing details were provided. Do not invent property facts.",
      "</listing_data>"
    ].join("\n");
  }

  return [
    "<listing_data>",
    "Use this structured listing data as the primary factual source for listing content.",
    "Do not fabricate missing values.",
    "```json",
    JSON.stringify(listingPropertyDetails, null, 2),
    "```",
    "</listing_data>"
  ].join("\n");
}

async function loadHookTemplates(input: PromptAssemblyInput): Promise<{
  hookTemplates: string[];
}> {
  const { category } = input;
  const globalHooksContent = await readPromptFile("hooks/global-hooks.md");
  const normalizedSubcategory = normalizeListingSubcategory(
    input.listing_subcategory
  );
  const categoryFile =
    category === "listing" && normalizedSubcategory
      ? LISTING_SUBCATEGORY_HOOK_FILES[normalizedSubcategory]
      : CATEGORY_HOOK_FILES[category];
  const categoryHooksContent = categoryFile
    ? await readPromptFile(categoryFile)
    : "";

  const combinedTemplates = uniqueTemplates(
    extractTemplateLines(`${globalHooksContent}\n${categoryHooksContent}`)
  );
  const seasonalExclusionPattern =
    category === "seasonal"
      ? /\b(market|buy|sell|listing|mortgage|rate|price)\b/i
      : null;
  const filteredTemplates = seasonalExclusionPattern
    ? combinedTemplates.filter(
        (template) => !seasonalExclusionPattern.test(template)
      )
    : combinedTemplates;

  const hookCandidates: string[] = [];

  for (const template of filteredTemplates) {
    const wordCount = countTemplateWords(template);
    if (wordCount >= HOOK_WORD_MIN && wordCount <= HOOK_WORD_MAX) {
      hookCandidates.push(template);
    }
  }

  return {
    hookTemplates: sampleTemplates(hookCandidates, HOOK_SAMPLE_COUNT)
  };
}

export async function buildSystemPrompt(input: PromptAssemblyInput) {
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
  const audienceDirective = await loadAudienceDirectives(
    input.audience_segments
  );
  const audienceSummary = audienceDirective
    ? buildAudienceSummary(
        audienceDirective,
        input.category,
        input.audience_description
      )
    : "";
  const { hookTemplates } = await loadHookTemplates(input);
  const agentTemplate = await readPromptFile("agent-profile.md");
  const communityTemplate = await readPromptFile("community-data.md");
  const complianceQuality = await readPromptFile("compliance-quality.md");
  const outputRequirements = await readPromptFile("output-requirements.md");

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
  const recentHooks = input.recent_hooks?.slice(0, 8) ?? [];
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

  return `
${baseSystemPrompt}

${agentProfile}

${audienceSummary}

<hooks>
Use these hook templates as the required source for hook phrasing. Pick one per item and adapt it with specifics.
Hooks must be 3-10 words and come from the hook templates list.
<hook_templates>
${formatTemplateList(hookTemplates)}
</hook_templates>
</hooks>

${recentHooksBlock}${marketBlock}${communityBlock}${seasonalBlock}${listingSubcategoryBlock}${listingDataBlock}

${complianceQuality}

${outputRequirements}
`.trim();
}

export function buildUserPrompt(input: PromptAssemblyInput): string {
  const { content_request, category, audience_segments } = input;
  const platform = content_request?.platform ?? "instagram";
  const contentType = content_request?.content_type ?? "social_post";
  const focus = content_request?.focus ?? "";
  const notes = content_request?.notes ?? "";
  return `
<content_request>
- **Category:** ${category}
- **Audience Segments:** ${audience_segments.join(", ") || "general"}
- **Platform:** ${platform}
- **Content Type:** ${contentType}
- **Focus:** ${focus || "No additional focus"}
- **Notes:** ${notes || "None"}
- **Listing Subcategory:** ${input.listing_subcategory ?? "None"}
</content_request>
`.trim();
}
