import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CommunityData, MarketData } from "@web/src/types/market";

type PromptValues = Record<string, string | number | null | undefined>;

export type AgentProfileInput = {
  agent_name: string;
  brokerage_name: string;
  agent_title?: string | null;
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
  market_data?: MarketDataInput | null;
  community_data?: CommunityDataInput | null;
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

const HOOK_WORD_MIN = 3;
const HOOK_WORD_MAX = 10;
const HOOK_SAMPLE_COUNT = 10;
const SUBHEADER_SAMPLE_COUNT = 6;

async function readPromptFile(relativePath: string): Promise<string> {
  if (promptCache.has(relativePath)) {
    return promptCache.get(relativePath)!;
  }

  const fullPath = path.join(PROMPTS_ROOT, relativePath);
  const content = await readFile(fullPath, "utf8");
  promptCache.set(relativePath, content);
  return content;
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

function buildAudienceSummary(content: string): string {
  const lines = content.split("\n");
  const titleMatch = content.match(/^##\s+(.+)$/m);
  const toneMatch = content.match(/^\*\*Tone:\*\*\s*(.+)$/m);
  const corePainPoints = extractBulletSection(lines, "**Core pain points:**");
  const keyTopics = extractSectionText(lines, "### Key Topics");
  const dataEmphasis = extractSectionText(lines, "### Data Emphasis");

  const summaryParts: string[] = [];
  if (titleMatch?.[1]) {
    summaryParts.push(`Audience: ${titleMatch[1].trim()}`);
  }
  if (toneMatch?.[1]) {
    summaryParts.push(`Tone: ${cleanSummaryText(toneMatch[1])}`);
  }
  if (corePainPoints.length > 0) {
    summaryParts.push(
      `Core pain points:\n- ${corePainPoints.join("\n- ")}`
    );
  }
  if (keyTopics) {
    summaryParts.push(`Key topics: ${keyTopics}`);
  }
  if (dataEmphasis) {
    summaryParts.push(`Data emphasis: ${dataEmphasis}`);
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
    ["summary", data.market_conditions_narrative || data.housing_market_summary],
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

async function loadHookTemplates(category: string): Promise<{
  hookTemplates: string[];
  subheaderTemplates: string[];
}> {
  const globalHooksContent = await readPromptFile("hooks/global-hooks.md");
  const categoryFile = CATEGORY_HOOK_FILES[category];
  const categoryHooksContent = categoryFile
    ? await readPromptFile(categoryFile)
    : "";

  const combinedTemplates = uniqueTemplates(
    extractTemplateLines(`${globalHooksContent}\n${categoryHooksContent}`)
  );

  const hookCandidates: string[] = [];
  const subheaderCandidates: string[] = [];

  for (const template of combinedTemplates) {
    const wordCount = countTemplateWords(template);
    if (wordCount >= HOOK_WORD_MIN && wordCount <= HOOK_WORD_MAX) {
      hookCandidates.push(template);
      continue;
    }
    subheaderCandidates.push(template);
  }

  return {
    hookTemplates: sampleTemplates(hookCandidates, HOOK_SAMPLE_COUNT),
    subheaderTemplates: sampleTemplates(
      subheaderCandidates,
      SUBHEADER_SAMPLE_COUNT
    )
  };
}

export async function buildSystemPrompt(input: PromptAssemblyInput) {
  const baseSystemPrompt = await readPromptFile("base-prompt.md");
  const audienceDirective = await loadAudienceDirectives(
    input.audience_segments
  );
  const audienceSummary = audienceDirective
    ? buildAudienceSummary(audienceDirective)
    : "";
  const { hookTemplates, subheaderTemplates } = await loadHookTemplates(
    input.category
  );
  const agentTemplate = await readPromptFile("agent-profile.md");
  const communityTemplate = await readPromptFile("community-data.md");
  const complianceQuality = await readPromptFile("compliance-quality.md");
  const outputRequirements = await readPromptFile("output-requirements.md");

  const styleNotes = input.agent_profile.writing_style_notes?.trim();
  const styleNotesBlock = styleNotes
    ? `Additional style notes (must follow): ${styleNotes}`
    : "";
  const agentProfileValues = {
    ...input.agent_profile,
    writing_style_description: input.agent_profile.writing_style_description,
    writing_style_notes_block: styleNotesBlock
  };
  const agentProfile = interpolateTemplate(agentTemplate, agentProfileValues);
  const marketData = input.market_data
    ? buildMarketDataXml(input.market_data)
    : "";
  const communityData = input.community_data
    ? interpolateTemplate(communityTemplate, input.community_data)
    : "";

  const outputDirective = `
<output_requirements>
${outputRequirements}

Return a JSON array of exactly 4 items. Each item must match the JSON schema. Output JSON only.
Constraints:
- Prefer single-image posts when possible.
- Add new lines between every 1-2 sentences to make it easier to read.
- Hooks should always be between 3-10 words (if longer, move part of the hook to the subheader)
- If carousel, max 5 slides.
- Captions must be concise and vary in length. Use this mix: 2 short (1-3 sentences), 1 medium (4-6 sentences), 1 long (7-10 sentences).
- Captions must not exceed ~700 characters.
- Writing style must match the writing style description and tone level. If a template conflicts with the required tone, rephrase it in the same structure and length.
- Hooks must be based on the hook templates below. Do not invent a hook style that isn't clearly derived from the list.
- Hook subheaders should be based on the subheader templates below when used.
- Avoid engagement bait or false urgency.
</output_requirements>`;

  const marketBlock =
    input.category === "market_insights" && marketData
      ? `\n\n${marketData}`
      : "";
  const communityBlock =
    input.category === "community" && communityData
      ? `\n\n<community_data>\n${communityData}\n</community_data>`
      : "";
  const recentHooks = input.recent_hooks?.slice(0, 8) ?? [];
  const recentHooksBlock =
    recentHooks.length > 0
      ? `\n\n<recent_hooks>\nDo NOT reuse or closely paraphrase any of these hooks:\n- ${recentHooks.join(
          "\n- "
        )}\n</recent_hooks>`
      : "";

  return `
${baseSystemPrompt}

${agentProfile}

${audienceSummary}

<hooks>
Use these hook templates as the required source for hook phrasing. Pick one per item and adapt it with specifics.
Hooks must be 3-10 words and come from the hook templates list.
Subheaders can be longer and should draw from the subheader templates list.
<hook_templates>
${formatTemplateList(hookTemplates)}
</hook_templates>
<subheader_templates>
${formatTemplateList(subheaderTemplates)}
</subheader_templates>
</hooks>

${recentHooksBlock}${marketBlock}${communityBlock}

${complianceQuality}

${outputDirective}
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
</content_request>
`.trim();
}
