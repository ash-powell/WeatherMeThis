import type { WeatherData } from './weather.models.js';

interface CacheEntry {
  data: WeatherData;
  expiresAt: number;
  estimatedBytes: number;
}

export interface RawWeatherCacheOptions {
  ttlMs?: number;
  maxEntries?: number;
  maxEstimatedBytes?: number;
  now?: () => number;
}

export interface RawWeatherCacheStats {
  entries: number;
  pendingRequests: number;
  estimatedBytes: number;
}

const defaultTtlMs = 30 * 60 * 1_000;
const defaultMaxEntries = 100;
const defaultMaxEstimatedBytes = 64 * 1024 * 1024;

export class RawWeatherCache {
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly maxEstimatedBytes: number;
  private readonly now: () => number;

  private readonly entries = new Map<string, CacheEntry>();
  private readonly pendingRequests = new Map<string, Promise<WeatherData>>();
  private estimatedBytes = 0;

  constructor(options: RawWeatherCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? defaultTtlMs;
    this.maxEntries = options.maxEntries ?? defaultMaxEntries;
    this.maxEstimatedBytes =
      options.maxEstimatedBytes ?? defaultMaxEstimatedBytes;
    this.now = options.now ?? Date.now;
  }

  hasAvailable(key: string): boolean {
    return this.get(key) !== null || this.pendingRequests.has(key);
  }

  get(key: string): WeatherData | null {
    const entry = this.entries.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= this.now()) {
      this.remove(key);
      return null;
    }

    // Refresh both the sliding expiration and Map insertion order for LRU eviction.
    entry.expiresAt = this.now() + this.ttlMs;
    this.entries.delete(key);
    this.entries.set(key, entry);

    return entry.data;
  }

  getOrLoad(
    key: string,
    loader: () => Promise<WeatherData>,
  ): Promise<WeatherData> {
    const cached = this.get(key);

    if (cached) {
      return Promise.resolve(cached);
    }

    const pending = this.pendingRequests.get(key);

    if (pending) {
      return pending;
    }

    const request = loader()
      .then((data) => {
        this.store(key, data);
        return data;
      })
      .finally(() => {
        if (this.pendingRequests.get(key) === request) {
          this.pendingRequests.delete(key);
        }
      });

    this.pendingRequests.set(key, request);
    return request;
  }

  stats(): RawWeatherCacheStats {
    this.removeExpired();

    return {
      entries: this.entries.size,
      pendingRequests: this.pendingRequests.size,
      estimatedBytes: this.estimatedBytes,
    };
  }

  clear(): void {
    this.entries.clear();
    this.pendingRequests.clear();
    this.estimatedBytes = 0;
  }

  private store(key: string, data: WeatherData): void {
    this.removeExpired();
    this.remove(key);

    const estimatedBytes = estimateWeatherDataBytes(data);

    // Oversized responses may still be returned to their caller; they simply are not cached.
    if (estimatedBytes > this.maxEstimatedBytes || this.maxEntries < 1) {
      return;
    }

    this.entries.set(key, {
      data,
      expiresAt: this.now() + this.ttlMs,
      estimatedBytes,
    });
    this.estimatedBytes += estimatedBytes;

    while (
      this.entries.size > this.maxEntries ||
      this.estimatedBytes > this.maxEstimatedBytes
    ) {
      const leastRecentlyUsedKey = this.entries.keys().next().value as
        string | undefined;

      if (leastRecentlyUsedKey === undefined) {
        break;
      }

      this.remove(leastRecentlyUsedKey);
    }
  }

  private removeExpired(): void {
    const now = this.now();

    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.remove(key);
      }
    }
  }

  private remove(key: string): void {
    const existing = this.entries.get(key);

    if (!existing) {
      return;
    }

    this.entries.delete(key);
    this.estimatedBytes -= existing.estimatedBytes;
  }
}

function estimateWeatherDataBytes(data: WeatherData): number {
  const dateBytes = data.dates.reduce(
    (total, date) => total + date.length * 2,
    0,
  );
  const valueBytes = data.values.length * 8;

  return dateBytes + valueBytes;
}
