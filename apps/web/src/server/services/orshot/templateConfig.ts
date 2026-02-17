import type { ListingContentSubcategory } from "@shared/types/models";
import type { OrshotTemplateConfig } from "@web/src/lib/orshot/types";
import templatesJson from "@web/src/lib/orshot/templates.json";

const ORSHOT_TEMPLATES = templatesJson as OrshotTemplateConfig[];

function shuffleTemplates<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

export function getTemplatesForSubcategory(
  subcategory: ListingContentSubcategory
): OrshotTemplateConfig[] {
  return ORSHOT_TEMPLATES.filter((template) =>
    template.subcategories.includes(subcategory)
  );
}

export function pickRandomTemplatesForSubcategory(params: {
  subcategory: ListingContentSubcategory;
  count: number;
}): OrshotTemplateConfig[] {
  const candidates = getTemplatesForSubcategory(params.subcategory);
  if (candidates.length === 0 || params.count <= 0) {
    return [];
  }

  const shuffled = shuffleTemplates(candidates);
  return shuffled.slice(0, Math.min(params.count, shuffled.length));
}
