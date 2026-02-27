import type {
  TemplateRenderConfig,
  TemplateRenderParameterKey
} from "@web/src/lib/domain/media/templateRender/types";
import { TEMPLATE_RENDER_IMAGE_PARAMETER_KEY_SET } from "@web/src/lib/domain/media/templateRender/types";

const DEFAULT_TEMPLATE_PAGE_LENGTH = 1;

function isPublicFetchableImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      return false;
    }
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function buildModifications(params: {
  resolvedParameters: Partial<Record<TemplateRenderParameterKey, string>>;
  template: TemplateRenderConfig;
}): Record<string, string> {
  const source = params.resolvedParameters;
  const requestedKeys =
    params.template.requiredParams.length > 0
      ? params.template.requiredParams
      : (Object.keys(source) as TemplateRenderParameterKey[]);

  const modifications: Record<string, string> = {};
  const isMultiPage =
    (params.template.pageLength ?? DEFAULT_TEMPLATE_PAGE_LENGTH) > 1;

  for (const key of requestedKeys) {
    const value = source[key];
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    if (
      TEMPLATE_RENDER_IMAGE_PARAMETER_KEY_SET.has(key) &&
      !isPublicFetchableImageUrl(trimmed)
    ) {
      continue;
    }

    const renderedKey = isMultiPage ? `page1@${key}` : key;
    modifications[renderedKey] = trimmed;
  }

  return modifications;
}
