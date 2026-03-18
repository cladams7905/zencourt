import type { TemplateRenderParameterKey } from "@web/src/lib/domain/media/templateRender/types";

const TRANSPARENT_IMAGE_URL =
  "https://upload.wikimedia.org/wikipedia/commons/c/ce/Transparent.gif";

export function applyAgentProfileImagePolicy(params: {
  resolvedParameters: Partial<Record<TemplateRenderParameterKey, string>>;
}): Partial<Record<TemplateRenderParameterKey, string>> {
  const next = { ...params.resolvedParameters };
  const agentProfileImage = next.agentProfileImage?.trim() ?? "";

  next.agentProfileImage = agentProfileImage || TRANSPARENT_IMAGE_URL;

  return next;
}
