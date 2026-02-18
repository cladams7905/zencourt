import { readPromptFile, AUDIENCE_FILES } from "./promptFileCache";
import {
  cleanSummaryText,
  extractSectionText,
  extractBulletSection
} from "./promptHelpers";

export async function loadAudienceDirectives(
  segments: string[]
): Promise<string> {
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

export function buildAudienceSummary(
  content: string,
  category?: string,
  audienceDescription?: string | null
): string {
  const lines = content.split("\n");
  const titleMatch = content.match(/^##\s+(.+)$/m);
  const toneMatch = content.match(/^\*\*Tone:\*\*\s*(.+)$/m);
  const whoTheyAre = extractSectionText(lines, "**Who they are:**");
  const corePainPoints = extractBulletSection(lines, "**Core pain points:**");
  const keyTopics = extractSectionText(lines, "### Key Topics");
  const dataEmphasis = extractSectionText(lines, "### Data Emphasis");

  const summaryParts: string[] = [];
  if (titleMatch?.[1]) {
    summaryParts.push(`Audience: ${titleMatch[1].trim()}`);
  }
  if (whoTheyAre) {
    summaryParts.push(`Who they are: ${whoTheyAre}`);
  }
  if (toneMatch?.[1]) {
    summaryParts.push(`Tone: ${cleanSummaryText(toneMatch[1])}`);
  }
  if (corePainPoints.length > 0) {
    summaryParts.push(
      `Core pain points:\n- ${corePainPoints.join("\n- ")}`
    );
  }
  const includeTopics =
    category !== "community" &&
    category !== "lifestyle" &&
    category !== "seasonal" &&
    category !== "listing";
  if (includeTopics && keyTopics) {
    summaryParts.push(`Key topics: ${keyTopics}`);
  }
  if (includeTopics && dataEmphasis) {
    summaryParts.push(`Data emphasis: ${dataEmphasis}`);
  }
  const includeAudienceDescription = category !== "listing";
  if (
    includeAudienceDescription &&
    audienceDescription &&
    audienceDescription.trim()
  ) {
    summaryParts.push(`Audience description: ${audienceDescription.trim()}`);
  }

  return summaryParts.length > 0
    ? `<audience_summary>\n${summaryParts.join("\n")}\n</audience_summary>`
    : "";
}
