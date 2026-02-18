import type { RedisLike } from "../cache";

export function createInMemoryRedisMock(seed?: Record<string, unknown>): RedisLike {
  const store = new Map<string, unknown>(Object.entries(seed ?? {}));

  return {
    get: async <T>(key: string) => (store.has(key) ? (store.get(key) as T) : null),
    set: async (key: string, value: unknown) => {
      store.set(key, value);
      return "OK";
    }
  };
}
