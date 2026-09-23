import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validateReportRequest } from '../src/reports/report.validator.js';

function reportWithWindows(windows: Array<number | null | undefined>) {
  return {
    name: 'Rain report',
    charts: [
      {
        name: 'Summer rain',
        comments: '',
        chartType: 'line',
        metricUnits: false,
        groupBy: 'year',
        seriesArray: windows.map((movingAverageWindow, index) => {
          const series: Record<string, unknown> = {
            title: `Series ${index + 1}`,
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
            movingAverageWindow,
          };

          if (movingAverageWindow === undefined) {
            delete series.movingAverageWindow;
          }

          return series;
        }),
      },
    ],
  };
}

describe('Moving averages in saved reports', () => {
  it('preserves different moving-average windows for series in one chart', () => {
    const report = validateReportRequest(reportWithWindows([null, 3, 5]));

    assert.deepEqual(
      report?.charts[0].seriesArray.map((series) => series.movingAverageWindow),
      [null, 3, 5],
    );
  });

  it('loads older series without a moving-average field as disabled', () => {
    assert.equal(
      validateReportRequest(reportWithWindows([undefined]))?.charts[0].seriesArray[0]
        .movingAverageWindow,
      null,
    );
  });

  it('rejects an invalid moving-average window on any series', () => {
    assert.equal(validateReportRequest(reportWithWindows([null, 1, 5])), null);
  });
});
