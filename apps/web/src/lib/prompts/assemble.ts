import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

type PromptValues = Record<string, string | number | null | undefined>;

export type AgentProfileInput = {
  agent_name: string;
  brokerage_name: string;
  agent_title?: string | null;
  city: string;
  state: string;
  zip_code: string;
  service_areas?: string | null;
  writing_style_description: string;
};

export type MarketDataInput = PromptValues;
export type CommunityDataInput = PromptValues;

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

async function readPromptFile(relativePath: string): Promise<string> {
  if (promptCache.has(relativePath)) {
    return promptCache.get(relativePath)!;
  }

  const fullPath = path.join(PROMPTS_ROOT, relativePath);
  const content = await readFile(fullPath, "utf8");
  promptCache.set(relativePath, content);
  return content;
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

async function loadHookTemplates(category: string): Promise<string> {
  const globalHooks = await readPromptFile("hooks/global-hooks.md");
  const categoryFile = CATEGORY_HOOK_FILES[category];

  if (!categoryFile) {
    return globalHooks;
  }

  const categoryHooks = await readPromptFile(categoryFile);
  return `${globalHooks}\n\n${categoryHooks}`;
}

export async function buildSystemPrompt(input: PromptAssemblyInput) {
  const baseSystemPrompt = await readPromptFile("base-prompt.md");
  const audienceDirective = await loadAudienceDirectives(
    input.audience_segments
  );
  const hookTemplates = await loadHookTemplates(input.category);
  const agentTemplate = await readPromptFile("agent-profile.md");
  const marketTemplate = await readPromptFile("market-data.md");
  const communityTemplate = await readPromptFile("community-data.md");

  const agentProfile = interpolateTemplate(agentTemplate, input.agent_profile);
  const marketData = input.market_data
    ? interpolateTemplate(marketTemplate, input.market_data)
    : "";
  const communityData = input.community_data
    ? interpolateTemplate(communityTemplate, input.community_data)
    : "";

  const outputDirective = `
<output_requirements>
Return a JSON array of exactly 4 items. Each item must match the JSON schema in the base prompt. Output JSON only.
Constraints:
- Prefer single-image posts when possible.
- Add new lines between every 1-2 sentences to make it easier to read.
- Hooks should always be between 3-10 words (if longer, move part of the hook to the subheader)
- If carousel, max 5 slides.
- Captions must be concise and vary in length. Use this mix: 2 short (1-3 sentences), 1 medium (4-6 sentences), 1 long (7-10 sentences).
- Captions must not exceed ~700 characters.
- You must select hook phrasing from the hook templates below. Do not invent a hook style that isn't clearly derived from the list.
</output_requirements>`;

  const marketBlock =
    input.category === "market_insights" && marketData
      ? `\n\n<market_data>\n${marketData}\n</market_data>`
      : "";
  const communityBlock =
    input.category === "community" && communityData
      ? `\n\n<community_data>\n${communityData}\n</community_data>`
      : "";
  const recentHooksBlock =
    input.recent_hooks && input.recent_hooks.length > 0
      ? `\n\n<recent_hooks>\nDo NOT reuse or closely paraphrase any of these hooks:\n- ${input.recent_hooks.join(
          "\n- "
        )}\n</recent_hooks>`
      : "";

  return `
${baseSystemPrompt}

<audience_directive>
${audienceDirective}
</audience_directive>

<hooks>
Use these hook templates as the required source for your hook phrasing. Pick one per item and adapt it with specifics. Do not ignore this list.
${hookTemplates}
</hooks>

<agent_profile>
${agentProfile}
</agent_profile>${marketBlock}${communityBlock}${recentHooksBlock}

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
