export function formatCurrencyUsd(
  value: number | null | undefined,
  fallback = ""
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatNumberUs(
  value: number | null | undefined,
  fallback = ""
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(value);
}

export function formatCountWithNoun(
  value: number | null | undefined,
  noun: string,
  fallback = ""
): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  const suffix = value === 1 ? noun : `${noun}s`;
  return `${formatNumberUs(value)} ${suffix}`;
}
