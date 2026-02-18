import { formatCurrencyUsd, formatNumberUs } from "@web/src/lib/core/formatting/number";
import type { RentCastMarketPayload, RentCastMarketResponse } from "../types";

export const NOT_AVAILABLE = "N/A";

export function pickNumber(
  source: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

export function pickObservationValue(
  observation: Record<string, unknown>
): number | null {
  return pickNumber(observation, ["value"]);
}

export function formatCurrency(value: number | null): string {
  return formatCurrencyUsd(value, NOT_AVAILABLE);
}

export function formatPercent(value: number | null): string {
  if (value === null) {
    return NOT_AVAILABLE;
  }
  const normalized = Math.abs(value) <= 1 ? value * 100 : value;
  return `${normalized.toFixed(1)}%`;
}

export function formatCount(value: number | null): string {
  return formatNumberUs(value, NOT_AVAILABLE);
}

export function sanitizeMarketField(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : NOT_AVAILABLE;
  }
  if (value === null || value === undefined) {
    return NOT_AVAILABLE;
  }
  return String(value);
}

export function normalizePayload(
  payload: RentCastMarketResponse
): RentCastMarketPayload {
  if (Array.isArray(payload)) {
    return (payload[0] as RentCastMarketPayload) ?? {};
  }

  if (payload && typeof payload === "object") {
    return payload as RentCastMarketPayload;
  }

  return {};
}

export function getSaleData(payload: RentCastMarketPayload): Record<string, unknown> {
  const saleData = payload.saleData;
  if (saleData && typeof saleData === "object") {
    return saleData;
  }
  return {};
}

export function getRentalData(
  payload: RentCastMarketPayload
): Record<string, unknown> {
  const rentalData = payload.rentalData;
  if (rentalData && typeof rentalData === "object") {
    return rentalData;
  }
  return {};
}
