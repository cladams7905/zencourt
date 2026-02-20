export function parseRequiredRouteParam(
  value: string | string[] | null | undefined,
  field: string
): string {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (!normalized || normalized.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  return normalized.trim();
}
