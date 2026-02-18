import {
  AUDIENCE_SEGMENT_ALIASES,
  NORMALIZED_AUDIENCE_SEGMENTS,
  type AudienceSegment
} from "@web/src/server/services/communityData/config";

export function normalizeAudienceSegment(
  segment?: string
): AudienceSegment | undefined {
  if (!segment) {
    return undefined;
  }

  const normalized = AUDIENCE_SEGMENT_ALIASES[segment] ?? segment;
  return NORMALIZED_AUDIENCE_SEGMENTS.has(normalized as AudienceSegment)
    ? (normalized as AudienceSegment)
    : undefined;
}
