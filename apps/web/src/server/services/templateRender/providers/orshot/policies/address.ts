export function sanitizeAddress(address: string): string {
  const ZIP_OR_POSTAL_CODE_PATTERN =
    /\b(\d{5}(?:-\d{4})?|[A-Z]\d[A-Z][ -]?\d[A-Z]\d)\b/gi;
  const COUNTRY_PATTERN =
    /^(usa|us|united states|united states of america|canada)$/i;

  const parts = address
    .split(",")
    .map((part) => part.replace(ZIP_OR_POSTAL_CODE_PATTERN, "").trim())
    .filter(Boolean);

  if (parts.length > 0 && COUNTRY_PATTERN.test(parts[parts.length - 1] ?? "")) {
    parts.pop();
  }

  return parts.join(", ").replace(/\s+/g, " ").trim();
}
