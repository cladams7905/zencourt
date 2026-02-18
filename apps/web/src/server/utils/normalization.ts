export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function normalizeOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
  }
  return undefined;
}

export function normalizeOptionalStringArray(
  value: unknown
): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalized = value
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeNullableString(
  value: unknown
): string | null | undefined {
  if (value === null) {
    return null;
  }
  return normalizeOptionalString(value);
}

export function normalizeNullableNumber(
  value: unknown
): number | null | undefined {
  if (value === null) {
    return null;
  }
  return normalizeOptionalNumber(value);
}

export function normalizeNullableBoolean(
  value: unknown
): boolean | null | undefined {
  if (value === null) {
    return null;
  }
  return normalizeOptionalBoolean(value);
}

export function normalizeNullableStringArray(
  value: unknown
): string[] | null | undefined {
  if (value === null) {
    return null;
  }
  return normalizeOptionalStringArray(value);
}
