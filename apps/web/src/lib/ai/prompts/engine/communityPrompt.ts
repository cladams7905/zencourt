import type { CommunityDataInput, PromptValues } from "./types";
import { hasMeaningfulValue, interpolateTemplate } from "./promptHelpers";

const COMMUNITY_DATA_DEFAULT = "- (none found)";

type CommunityTemplateSection = {
  key: string | null;
  lines: string[];
};

export function parseCommunityTemplate(template: string): {
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

export function buildCommunityDataPrompt(
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

export function buildExtraSectionsPrompt(
  extraSections?: Record<string, string> | null
): string {
  const entries = extraSections
    ? Object.entries(extraSections).filter(([, value]) =>
        hasMeaningfulValue(value)
      )
    : [];

  return entries.map(([key, value]) => `${key}:\n${value}`).join("\n");
}
