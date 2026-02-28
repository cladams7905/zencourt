import { format, isValid, parse, parseISO } from "date-fns";

const ISO_DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;
const WEEKDAY_PREFIX =
  /^(mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday|sun|sunday),?\s+/i;
const LEGACY_DATE_FORMATS = [
  "yyyy-MM-dd",
  "yyyy-M-d",
  "M/d/yyyy",
  "MM/dd/yyyy",
  "MMM d, yyyy",
  "MMMM d, yyyy",
  "EEE, MMM d, yyyy",
  "EEEE, MMM d, yyyy",
  "EEE, MMM d",
  "EEEE, MMM d",
  "EEE, MMMM d",
  "EEEE, MMMM d",
  "EEE MMM d",
  "EEEE MMM d",
  "MMM d",
  "MMMM d"
] as const;

export function parseReviewDate(
  dateStr: string | null | undefined
): Date | undefined {
  if (!dateStr) return undefined;

  const trimmed = dateStr.trim();
  if (!trimmed) return undefined;
  const normalizedLegacy = trimmed
    .replace(/\s+/g, " ")
    .replace(/(\d)(st|nd|rd|th)\b/gi, "$1")
    .replace(WEEKDAY_PREFIX, "")
    .trim();

  const normalizedIsoDate = trimmed.match(ISO_DATE_PREFIX)?.[1];
  if (normalizedIsoDate) {
    const parsedIsoPrefix = parse(normalizedIsoDate, "yyyy-MM-dd", new Date());
    if (isValid(parsedIsoPrefix)) {
      return parsedIsoPrefix;
    }
  }

  const parsedIso = parseISO(trimmed);
  if (isValid(parsedIso)) {
    return parsedIso;
  }

  for (const dateFormat of LEGACY_DATE_FORMATS) {
    const parsed = parse(normalizedLegacy, dateFormat, new Date());
    if (isValid(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

export function formatDateDisplay(dateStr: string | null | undefined): string {
  if (!dateStr) return "";

  const parsed = parseReviewDate(dateStr);
  if (!parsed) return dateStr;

  return format(parsed, "MMM d, yyyy");
}

export const toNullableString = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const toNullableNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatListingPrice = (value: string) => {
  const digitsOnly = value.replace(/[^\d]/g, "");
  if (!digitsOnly) {
    return "";
  }

  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(Number(digitsOnly));

  return `$${formatted}`;
};

export const roundBathroomsToHalfStep = (value: number) => {
  return Math.round(value * 2) / 2;
};
