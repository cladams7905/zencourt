import { pickNumber } from "./transforms";

export function pickTimestamp(
  saleData: Record<string, unknown>,
  rentalData: Record<string, unknown>,
  now: () => Date
): string {
  const saleTimestamp = saleData.lastUpdatedDate;
  if (typeof saleTimestamp === "string" && saleTimestamp.trim() !== "") {
    return saleTimestamp;
  }

  const rentalTimestamp = rentalData.lastUpdatedDate;
  if (typeof rentalTimestamp === "string" && rentalTimestamp.trim() !== "") {
    return rentalTimestamp;
  }

  return now().toISOString();
}

export function extractHistoryMap(
  source: Record<string, unknown>
): Record<string, Record<string, unknown>> {
  const history = source.history;
  if (!history || typeof history !== "object") {
    return {};
  }
  return history as Record<string, Record<string, unknown>>;
}

function toYearMonth(dateLike: string): string | null {
  const parsed = new Date(dateLike);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getLatestHistoryKey(
  history: Record<string, Record<string, unknown>>,
  fallbackDate: string
): string | null {
  const keys = Object.keys(history).sort();
  if (keys.length === 0) {
    return null;
  }

  const desired = toYearMonth(fallbackDate);
  if (desired && history[desired]) {
    return desired;
  }

  // Always use the latest available history point when fallback month is missing.
  return keys.at(-1) ?? null;
}

export function getPriorYearKey(latestKey: string): string | null {
  const match = latestKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number.parseInt(match[1], 10);
  const month = match[2];
  if (!Number.isFinite(year)) {
    return null;
  }
  return `${year - 1}-${month}`;
}

export function computeYoYChange(
  history: Record<string, Record<string, unknown>>,
  latestKey: string | null,
  valueKey: string
): number | null {
  if (!latestKey) {
    return null;
  }

  const priorKey = getPriorYearKey(latestKey);
  if (!priorKey) {
    return null;
  }

  const latestEntry = history[latestKey] ?? {};
  const priorEntry = history[priorKey] ?? {};

  const latestValue = pickNumber(latestEntry, [valueKey]);
  const priorValue = pickNumber(priorEntry, [valueKey]);

  if (latestValue === null || priorValue === null || priorValue === 0) {
    return null;
  }

  return (latestValue - priorValue) / priorValue;
}
