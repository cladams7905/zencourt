const MINUTE_MS = 60 * 1000;

export const VIDEO_GENERATION_CONCURRENCY = 3;
export const VIDEO_GENERATION_TIMEOUT_MESSAGE =
  "Generation timed out, please try again later.";

export function getClipRegenerationSoftTimeoutMs(): number {
  return 2 * MINUTE_MS;
}

export function getClipRegenerationHardTimeoutMs(): number {
  return 3 * MINUTE_MS;
}

function getBatchWaveCount(jobCount: number): number {
  return Math.max(1, Math.ceil(Math.max(jobCount, 1) / VIDEO_GENERATION_CONCURRENCY));
}

export function getBatchGenerationSoftTimeoutMs(jobCount: number): number {
  return (2 + getBatchWaveCount(jobCount) * 5) * MINUTE_MS;
}

export function getBatchGenerationHardTimeoutMs(jobCount: number): number {
  return (4 + getBatchWaveCount(jobCount) * 6) * MINUTE_MS;
}

export function isPastTimeout(
  createdAt: string | Date | null | undefined,
  timeoutMs: number,
  nowMs: number = Date.now()
): boolean {
  if (!createdAt) {
    return false;
  }

  const timestamp =
    createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return nowMs - timestamp >= timeoutMs;
}
