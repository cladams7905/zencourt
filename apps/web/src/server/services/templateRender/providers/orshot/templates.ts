import type { ListingContentSubcategory } from "@shared/types/models";
import type { TemplateRenderConfig } from "@web/src/lib/domain/media/templateRender/types";
import templatesJson from "@web/src/lib/domain/media/orshot/templates.json";

const ORSHOT_TEMPLATES = templatesJson as TemplateRenderConfig[];

function shuffleTemplates<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

export function getTemplatesForSubcategory(
  subcategory: ListingContentSubcategory
): TemplateRenderConfig[] {
  return ORSHOT_TEMPLATES.filter((template) =>
    template.subcategories.includes(subcategory)
  );
}

export function getTemplateById(id: string): TemplateRenderConfig | null {
  const template = ORSHOT_TEMPLATES.find((t) => t.id === id);
  return template ?? null;
}

export function pickRandomTemplatesForSubcategory(params: {
  subcategory: ListingContentSubcategory;
  count: number;
  random?: () => number;
}): TemplateRenderConfig[] {
  const candidates = getTemplatesForSubcategory(params.subcategory);
  if (candidates.length === 0 || params.count <= 0) {
    return [];
  }

  const shuffled = shuffleTemplates(candidates, params.random ?? Math.random);
  return shuffled.slice(0, Math.min(params.count, shuffled.length));
}
