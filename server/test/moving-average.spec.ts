import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { analyzeWeather } from '../src/weather/domain/weather-analysis.js';
import type { AnalysisOptions, WeatherData } from '../src/weather/weather.models.js';
import {
  hasValidMovingAverageOptions,
  validateAnalysisRequest,
} from '../src/weather/weather.validator.js';

function movingAverageOptions(
  overrides: Partial<AnalysisOptions> = {},
): AnalysisOptions {
  return {
    groupBy: 'year',
    movingAverageWindow: 3,
    aggregation: 'sum',
    avgFrequency: 'none',
    comparison: 'none',
    threshold: null,
    dateFilter: { unit: 'none', min: '', max: '' },
    startDate: '2021-01-01',
    endDate: '2025-12-31',
    ...overrides,
  };
}

function validRequest() {
  return {
    location: {
      city: 'Raleigh',
      admin1: 'North Carolina',
      country: 'United States',
      latitude: 35.7796,
      longitude: -78.6382,
    },
    startDate: '2021-01-01',
    endDate: '2025-12-31',
    dateFilter: { unit: 'month', min: '06', max: '08' },
    measurement: 'rain_sum',
    comparison: 'none',
    threshold: null,
    aggregation: 'sum',
    avgFrequency: 'none',
    metricUnits: false,
    groupBy: 'year',
    movingAverageWindow: 3,
  };
}

describe('Moving-average calculation', () => {
  it('averages consecutive aggregated chart points after a complete window exists', () => {
    const data: WeatherData = {
      dates: ['2021-06-01', '2022-06-01', '2023-06-01', '2024-06-01', '2025-06-01'],
      values: [1, 2, 3, 4, 5],
    };

    assert.deepEqual(analyzeWeather(data, movingAverageOptions()), [
      { date: '2021', value: null },
      { date: '2022', value: null },
      { date: '2023', value: 2 },
      { date: '2024', value: 3 },
      { date: '2025', value: 4 },
    ]);
  });

  it('keeps missing points in the window but excludes them from its denominator', () => {
    const data: WeatherData = {
      dates: ['2021-06-01', '2022-06-01', '2023-06-01'],
      values: [1, null, 5],
    };

    assert.deepEqual(analyzeWeather(data, movingAverageOptions()), [
      { date: '2021', value: null },
      { date: '2022', value: null },
      { date: '2023', value: 3 },
    ]);
  });

  it('applies the date filter before the moving average', () => {
    const data: WeatherData = {
      dates: ['2021-06-01', '2021-12-01', '2022-06-01', '2022-12-01'],
      values: [2, 100, 4, 100],
    };

    assert.deepEqual(
      analyzeWeather(
        data,
        movingAverageOptions({
          movingAverageWindow: 2,
          dateFilter: { unit: 'month', min: '06', max: '06' },
        }),
      ),
      [
        { date: '2021', value: null },
        { date: '2022', value: 3 },
      ],
    );
  });
});

describe('Moving-average validation', () => {
  it('accepts a supported window, grouping, and finer-grained date filter', () => {
    assert.notEqual(validateAnalysisRequest(validRequest()), null);
  });

  it('rejects windows smaller than two or nonintegers', () => {
    assert.equal(validateAnalysisRequest({ ...validRequest(), movingAverageWindow: 1 }), null);
    assert.equal(validateAnalysisRequest({ ...validRequest(), movingAverageWindow: 2.5 }), null);
  });

  it('rejects unsupported groupings and incompatible date filters', () => {
    assert.equal(hasValidMovingAverageOptions(3, 'all', 'none'), false);
    assert.equal(hasValidMovingAverageOptions(3, 'yearMonth', 'month'), false);
    assert.equal(hasValidMovingAverageOptions(3, 'yearMonth', 'day'), true);
    assert.equal(hasValidMovingAverageOptions(3, 'yearMonthDay', 'none'), true);
  });

  it('keeps requests without a moving-average field backward compatible', () => {
    const request = validRequest();
    const { movingAverageWindow: _omitted, ...oldRequest } = request;
    assert.equal(validateAnalysisRequest(oldRequest)?.movingAverageWindow, null);
  });
});
