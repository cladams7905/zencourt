/**
 * TTL Cache with automatic expiration and size limits.
 * Prevents memory leaks in long-running processes.
 */

export interface CacheOptions {
  /** Maximum number of entries (default: 1000) */
  maxSize?: number;
  /** Time-to-live in milliseconds (default: 30 minutes) */
  ttlMs?: number;
}

interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

export class TTLCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private maxSize: number;
  private ttlMs: number;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize ?? 1000;
    this.ttlMs = options.ttlMs ?? 30 * 60 * 1000; // 30 minutes default
  }

  /**
   * Get a value from the cache. Returns undefined if not found or expired.
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Set a value in the cache with optional custom TTL.
   */
  set(key: K, value: V, ttlMs?: number): void {
    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.ttlMs)
    });
  }

  /**
   * Delete a key from the cache.
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current number of entries (including potentially expired ones).
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Remove expired entries from the cache.
   * Returns the number of entries pruned.
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Start automatic periodic pruning.
   * Returns a function to stop the interval.
   */
  startAutoPrune(intervalMs: number = 5 * 60 * 1000): () => void {
    const interval = setInterval(() => {
      this.prune();
    }, intervalMs);

    return () => clearInterval(interval);
  }
}
