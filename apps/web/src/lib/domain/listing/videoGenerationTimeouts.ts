const MINUTE_MS = 60 * 1000;

export const VIDEO_GENERATION_CONCURRENCY = 3;
export const VIDEO_GENERATION_TIMEOUT_MESSAGE =
  "Generation is taking longer than usual because the queue is busy. We'll keep trying.";

export function getClipRegenerationSoftTimeoutMs(): number {
  return 3 * MINUTE_MS;
}

export function getClipRegenerationHardTimeoutMs(): number {
  return 30 * MINUTE_MS;
}

function getBatchWaveCount(jobCount: number): number {
  return Math.max(1, Math.ceil(Math.max(jobCount, 1) / VIDEO_GENERATION_CONCURRENCY));
}

export function getBatchGenerationSoftTimeoutMs(jobCount: number): number {
  void jobCount;
  return 5 * MINUTE_MS;
}

export function getBatchGenerationHardTimeoutMs(jobCount: number): number {
  return (15 + getBatchWaveCount(jobCount) * 15) * MINUTE_MS;
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
