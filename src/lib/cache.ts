/**
 * Simple cache abstraction
 * Uses in-memory cache by default, can be swapped for Redis later
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
let cacheInstance: MemoryCache | null = null;

function getCache(): MemoryCache {
  if (!cacheInstance) {
    cacheInstance = new MemoryCache();
  }
  return cacheInstance;
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    // TODO: When Redis is added, check REDIS_URL and use Redis client
    return getCache().get<T>(key);
  },

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    // TODO: When Redis is added, check REDIS_URL and use Redis client
    return getCache().set(key, value, ttlSeconds);
  },

  async delete(key: string): Promise<void> {
    return getCache().delete(key);
  },

  async clear(): Promise<void> {
    return getCache().clear();
  },
};

export function getCacheKey(prefix: string, ...parts: string[]): string {
  return `${prefix}:${parts.join(':')}`;
}

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    console.log(`Cache HIT: ${key}`);
    return cached;
  }

  console.log(`Cache MISS: ${key}`);
  const result = await fn();
  await cache.set(key, result, ttlSeconds);
  
  return result;
}
