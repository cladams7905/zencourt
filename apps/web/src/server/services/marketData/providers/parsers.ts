import type { FredObservationResponse, RentCastMarketResponse } from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseRentCastMarketResponse(
  raw: unknown
): RentCastMarketResponse {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (isRecord(raw)) {
    return raw;
  }
  return {};
}

export function parseFredObservationResponse(
  raw: unknown
): FredObservationResponse {
  if (!isRecord(raw)) {
    return {};
  }

  const observations = raw.observations;
  if (!Array.isArray(observations)) {
    return {};
  }

  const normalized = observations.filter(isRecord);
  return { observations: normalized };
}
