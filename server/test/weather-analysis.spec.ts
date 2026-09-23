import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { analyzeWeather } from '../src/weather/domain/weather-analysis.js';
import type { AnalysisOptions, WeatherData } from '../src/weather/weather.models.js';

function averageMatchingDaysOptions(
  overrides: Partial<AnalysisOptions> = {},
): AnalysisOptions {
  return {
    groupBy: 'all',
    movingAverageWindow: null,
    aggregation: 'avgMatchingDays',
    avgFrequency: 'daily',
    comparison: '>',
    threshold: 0,
    dateFilter: { unit: 'none', min: '', max: '' },
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    ...overrides,
  };
}

function analyze(data: WeatherData, overrides: Partial<AnalysisOptions> = {}) {
  return analyzeWeather(data, averageMatchingDaysOptions(overrides));
}

describe('Average on Matching Days', () => {
  it('divides the sum of matching values by the number of matching days', () => {
    const result = analyze({
      dates: ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04'],
      values: [0, 2, 0, 4],
    });
    assert.deepEqual(result, [{ date: 'all', value: 3 }]);
  });

  it('excludes nonmatching days from both the numerator and denominator', () => {
    const result = analyze(
      { dates: ['2026-01-01', '2026-01-02', '2026-01-03'], values: [100, 2, 4] },
      { comparison: '<', threshold: 10 },
    );
    assert.deepEqual(result, [{ date: 'all', value: 3 }]);
  });

  it('does not include null weather values in the denominator', () => {
    const result = analyze({
      dates: ['2026-01-01', '2026-01-02', '2026-01-03'],
      values: [null, 2, 4],
    });
    assert.deepEqual(result, [{ date: 'all', value: 3 }]);
  });

  it('returns zero when usable values exist but none match', () => {
    const result = analyze({ dates: ['2026-01-01', '2026-01-02'], values: [0, 0] });
    assert.deepEqual(result, [{ date: 'all', value: 0 }]);
  });

  it('returns null when a group contains no usable weather values', () => {
    const result = analyze({ dates: ['2026-01-01', '2026-01-02'], values: [null, null] });
    assert.deepEqual(result, [{ date: 'all', value: null }]);
  });

  it('excludes date-filtered-out days from the calculation', () => {
    const result = analyze(
      { dates: ['2026-01-01', '2026-02-01', '2026-02-02'], values: [100, 2, 4] },
      {
        dateFilter: { unit: 'month', min: '02', max: '02' },
      },
    );
    assert.deepEqual(result, [{ date: 'all', value: 3 }]);
  });

  it('supports strict greater-than comparisons', () => {
    const result = analyze(
      { dates: ['2026-01-01', '2026-01-02'], values: [2, 4] },
      { comparison: '>', threshold: 2 },
    );
    assert.deepEqual(result, [{ date: 'all', value: 4 }]);
  });
});
