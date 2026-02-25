import type { CityDescriptionCachePayload } from "../providers/google/cache";

export function buildCityDescriptionPrompt(city: string, state: string): string {
  return `Write a 2-3 sentence high-quality description summarizing the city of ${city}, ${state}. This should include the general vibe of the area, places of interest, and its proximity to other things in the geographic region. Keep it brief but informative. Output only the sentences.`;
}

export function parseCityDescriptionResult(result: {
  text: string | null;
  citations?: Array<{ title?: string; url?: string; source?: string }>;
}): CityDescriptionCachePayload | null {
  const text = result.text?.trim();
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as {
      description?: string | null;
      citations?: Array<{
        title?: string | null;
        url?: string | null;
        source?: string | null;
      }> | null;
    };
    const description = parsed.description?.replace(/\s+/g, " ").trim() ?? "";
    if (!description) {
      return null;
    }
    return {
      description,
      citations: parsed.citations
        ? parsed.citations.map((citation) => ({
            ...(citation.title ? { title: citation.title } : {}),
            ...(citation.url ? { url: citation.url } : {}),
            ...(citation.source ? { source: citation.source } : {})
          }))
        : (result.citations ?? null)
    };
  } catch {
    const description = text.replace(/\s+/g, " ").trim();
    return description
      ? {
          description,
          citations: result.citations ?? null
        }
      : null;
  }
}
