import type { TemplateRenderParameterKey } from "@web/src/lib/domain/media/templateRender/types";

function compactList(values: Array<string | null | undefined>): string[] {
  return values.map((value) => value?.trim() ?? "").filter((value) => value.length > 0);
}

function resolveOptionalContactValue(
  source: Record<string, unknown>,
  keys: string[]
): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

export function applyContactPolicy(params: {
  resolvedParameters: Partial<Record<TemplateRenderParameterKey, string>>;
  contactSource: Record<string, unknown>;
  random?: () => number;
}): Partial<Record<TemplateRenderParameterKey, string>> {
  const next = { ...params.resolvedParameters };
  const random = params.random ?? Math.random;

  const agentTitle = next.agentTitle?.trim() ?? "";
  const agencyName = next.agencyName?.trim() ?? "";

  const website = resolveOptionalContactValue(params.contactSource, [
    "website",
    "websiteUrl",
    "siteUrl"
  ]);
  const phone = resolveOptionalContactValue(params.contactSource, [
    "phoneNumber",
    "phone",
    "mobilePhone"
  ]);
  const email = resolveOptionalContactValue(params.contactSource, ["email", "contactEmail"]);

  const optionalContacts = compactList([website, phone, email]);
  const optionalContact =
    optionalContacts.length > 0
      ? optionalContacts[Math.floor(random() * optionalContacts.length)] ?? ""
      : "";

  const prioritized = compactList([agentTitle, agencyName, optionalContact]).slice(0, 3);
  next.agentContactInfo = prioritized.join(" | ");
  next.agentContact1 = prioritized[0] ?? "";
  next.agentContact2 = prioritized[1] ?? "";
  next.agentContact3 = prioritized[2] ?? "";
  return next;
}
