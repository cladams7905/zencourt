export function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

export function getExponentialBackoffDelayMs(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  return Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
