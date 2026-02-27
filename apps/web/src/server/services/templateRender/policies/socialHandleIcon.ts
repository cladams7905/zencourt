import type { TemplateRenderParameterKey } from "@web/src/lib/domain/media/templateRender/types";

const INSTAGRAM_ICON_URL =
  "https://cdn.orshot.com/elements/icons/logos/instagram.svg";
const TRANSPARENT_ICON_URL =
  "https://upload.wikimedia.org/wikipedia/commons/c/ce/Transparent.gif";

export function applySocialHandleIconPolicy(params: {
  resolvedParameters: Partial<Record<TemplateRenderParameterKey, string>>;
}): Partial<Record<TemplateRenderParameterKey, string>> {
  const next = { ...params.resolvedParameters };
  const socialHandle = next.socialHandle?.trim() ?? "";

  next.socialHandleIcon = socialHandle ? INSTAGRAM_ICON_URL : TRANSPARENT_ICON_URL;

  return next;
}
