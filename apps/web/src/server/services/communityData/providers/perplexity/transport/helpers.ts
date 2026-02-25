import type { AudienceSegment } from "@web/src/server/services/_config/community";

export function getWhySuitableFieldKey(audience?: AudienceSegment): string {
  return audience
    ? `why_suitable_for_${audience}`
    : "why_suitable_for_audience";
}
