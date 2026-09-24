import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  estimateOpenMeteoCallCost,
  rawWeatherRequestKey,
} from '../src/weather/open-meteo-cost.js';
import { OpenMeteoRateLimiter } from '../src/weather/open-meteo-rate-limiter.js';
import { RawWeatherCache } from '../src/weather/raw-weather-cache.js';
import {
  analyzeWeatherRequest,
  clearRawWeatherCacheForTests,
  planWeatherRequests,
} from '../src/weather/weather.service.js';

import type {
  AnalysisRequest,
  WeatherData,
} from '../src/weather/weather.models.js';

function request(
  startDate = '2006-01-01',
  endDate = '2025-12-31',
): AnalysisRequest {
  return {
    metricUnits: false,
    location: {
      city: 'Raleigh',
      admin1: 'North Carolina',
      country: 'United States',
      latitude: 35.7796,
      longitude: -78.6382,
    },
    startDate,
    endDate,
    dateFilter: { unit: 'none', min: '', max: '' },
    measurement: 'rain_sum',
    comparison: 'none',
    threshold: null,
    aggregation: 'sum',
    avgFrequency: 'none',
    groupBy: 'year',
    movingAverageWindow: null,
  };
}

const weatherData: WeatherData = {
  dates: ['2025-01-01'],
  values: [2.5],
};

describe('Raw weather cache', () => {
  it('deduplicates simultaneous identical loads', async () => {
    const cache = new RawWeatherCache();
    let loads = 0;
    let resolveLoad!: (data: WeatherData) => void;
    const loader = () => {
      loads++;
      return new Promise<WeatherData>((resolve) => {
        resolveLoad = resolve;
      });
    };

    const first = cache.getOrLoad('same-request', loader);
    const second = cache.getOrLoad('same-request', loader);

    assert.equal(loads, 1);
    resolveLoad(weatherData);
    assert.equal(await first, weatherData);
    assert.equal(await second, weatherData);
    assert.equal(cache.stats().entries, 1);
  });

  it('expires inactive entries and does not cache failed loads', async () => {
    let now = 0;
    const cache = new RawWeatherCache({ ttlMs: 100, now: () => now });

    await cache.getOrLoad('success', async () => weatherData);
    await assert.rejects(
      cache.getOrLoad('failure', async () => Promise.reject(new Error('no'))),
    );
    assert.equal(cache.stats().entries, 1);

    now = 101;
    assert.equal(cache.hasAvailable('success'), false);
    assert.deepEqual(cache.stats(), {
      entries: 0,
      pendingRequests: 0,
      estimatedBytes: 0,
    });
  });

  it('evicts the least recently used entry when the entry limit is reached', async () => {
    const cache = new RawWeatherCache({ maxEntries: 2 });

    await cache.getOrLoad('first', async () => weatherData);
    await cache.getOrLoad('second', async () => weatherData);
    assert.equal(cache.get('first'), weatherData);
    await cache.getOrLoad('third', async () => weatherData);

    assert.equal(cache.hasAvailable('first'), true);
    assert.equal(cache.hasAvailable('second'), false);
    assert.equal(cache.hasAvailable('third'), true);
  });
});

describe('Open-Meteo cost and pacing', () => {
  it('estimates approximately 52 weighted calls for one variable over 20 years', () => {
    assert.ok(Math.abs(estimateOpenMeteoCallCost(request()) - 52.18) < 0.1);
  });

  it('uses the same raw cache key when only analysis options or units change', () => {
    const original = request();
    const changed = {
      ...original,
      metricUnits: true,
      aggregation: 'max' as const,
      groupBy: 'month' as const,
      threshold: 2,
      comparison: '>=' as const,
    };

    assert.equal(rawWeatherRequestKey(changed), rawWeatherRequestKey(original));
  });

  it('waits for a new rate-limit window before exceeding the safety budget', async () => {
    let now = 0;
    const waits: number[] = [];
    const limiter = new OpenMeteoRateLimiter({
      budget: 590,
      windowMs: 61_000,
      now: () => now,
      wait: async (milliseconds) => {
        waits.push(milliseconds);
        now += milliseconds;
      },
    });

    await limiter.reserve(400);
    await limiter.reserve(190);
    await limiter.reserve(1);

    assert.deepEqual(waits, [61_000]);
  });
});

describe('Weather service cache integration', () => {
  it('retrieves raw observations once and reuses them for a different aggregation', async () => {
    clearRawWeatherCacheForTests();
    const originalFetch = globalThis.fetch;
    let fetches = 0;

    globalThis.fetch = async () => {
      fetches++;
      return new Response(
        JSON.stringify({
          daily: {
            time: ['2025-01-01', '2025-01-02'],
            rain_sum: [2, 4],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };

    try {
      const sumRequest: AnalysisRequest = {
        ...request('2025-01-01', '2025-01-02'),
        metricUnits: true,
      };
      const maximumRequest: AnalysisRequest = {
        ...sumRequest,
        aggregation: 'max',
      };

      assert.deepEqual(planWeatherRequests([sumRequest]), {
        cacheMisses: 1,
        estimatedOpenMeteoCalls: 1,
        requiresConfirmation: false,
      });

      assert.deepEqual(await analyzeWeatherRequest(sumRequest), [
        { date: '2025', value: 6 },
      ]);
      assert.equal(planWeatherRequests([maximumRequest]).cacheMisses, 0);
      assert.deepEqual(await analyzeWeatherRequest(maximumRequest), [
        { date: '2025', value: 4 },
      ]);
      assert.equal(fetches, 1);
    } finally {
      globalThis.fetch = originalFetch;
      clearRawWeatherCacheForTests();
    }
  });
});
