export type StorageHealthCache = {
  healthy: boolean;
  timestamp: number;
};

export function getCachedHealth(
  cache: StorageHealthCache | null,
  cacheMs: number,
  now: number
): boolean | null {
  if (!cache || cacheMs <= 0) {
    return null;
  }
  return now - cache.timestamp < cacheMs ? cache.healthy : null;
}
