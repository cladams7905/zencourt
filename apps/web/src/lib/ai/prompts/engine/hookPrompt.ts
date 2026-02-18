import type { PromptAssemblyInput } from "./types";
import {
  readPromptFile,
  CATEGORY_HOOK_FILES,
  LISTING_SUBCATEGORY_HOOK_FILES
} from "./promptFileCache";
import { normalizeListingSubcategory } from "./promptHelpers";

const HOOK_WORD_MIN = 3;
const HOOK_WORD_MAX = 10;
const HOOK_SAMPLE_COUNT = 10;

export function countTemplateWords(template: string): number {
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

export function extractTemplateLines(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

export function uniqueTemplates(templates: string[]): string[] {
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

export function sampleTemplates(templates: string[], count: number): string[] {
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

export function formatTemplateList(templates: string[]): string {
  if (templates.length === 0) {
    return "- (none available)";
  }
  return `- ${templates.join("\n- ")}`;
}

export async function loadHookTemplates(input: PromptAssemblyInput): Promise<{
  hookTemplates: string[];
}> {
  const { category } = input;
  const normalizedSubcategory = normalizeListingSubcategory(
    input.listing_subcategory
  );
  const isListingWithSubcategory =
    category === "listing" && normalizedSubcategory !== null;

  // Skip global hooks for listing subcategories — subcategory hooks are
  // already 20-25 templates and more relevant than generic global hooks.
  const globalHooksContent = isListingWithSubcategory
    ? ""
    : await readPromptFile("hooks/global-hooks.md");
  const categoryFile = isListingWithSubcategory
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
