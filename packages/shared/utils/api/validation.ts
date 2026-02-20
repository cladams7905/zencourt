export function requireNonEmptyParam(
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

export function requireNonEmptyStringArray(
  value: unknown,
  field: string
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${field} must be a non-empty array`);
  }

  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);

  if (normalized.length === 0) {
    throw new Error(`${field} must contain at least one valid string value`);
  }

  return normalized;
}

type JsonBodyReader = Request | { json(): Promise<unknown> };

export async function readJsonBodySafe(
  request: JsonBodyReader
): Promise<Record<string, unknown> | null> {
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}
