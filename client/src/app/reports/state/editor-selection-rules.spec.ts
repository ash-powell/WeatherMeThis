import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { ReportFacade } from '../application/report-facade';
import { ReportEditorStore } from './report-editor-store';
import { ReportLayoutState } from './report-layout-state';

describe('Editor selection rules', () => {
  function setup(): {
    facade: ReportFacade;
    store: ReportEditorStore;
    layout: ReportLayoutState;
  } {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });

    return {
      facade: TestBed.inject(ReportFacade),
      store: TestBed.inject(ReportEditorStore),
      layout: TestBed.inject(ReportLayoutState),
    };
  }

  it('selects Exact date for Non-aggregated values and keeps every series compatible', () => {
    const { facade, store } = setup();
    const chart = store.report().charts[0];
    store.addSeries(chart.chartId, chart.seriesInputs[0].seriesId, false);

    facade.setAggregation(chart.chartId, chart.seriesInputs[0].seriesId, 'rawValues');

    const updated = store.report().charts[0];
    expect(updated.groupBy).toBe('yearMonthDay');
    expect(updated.seriesInputs.every((series) => series.aggregation === 'rawValues')).toBe(true);
    expect(updated.seriesInputs.every((series) => series.avgFrequency === 'none')).toBe(true);
  });

  it('selects Non-aggregated values for every series when Exact date is selected', () => {
    const { facade, store } = setup();
    const chart = store.report().charts[0];
    store.addSeries(chart.chartId, chart.seriesInputs[0].seriesId, false);

    facade.setGroupBy(chart.chartId, 'yearMonthDay');

    expect(
      store.report().charts[0].seriesInputs.every((series) => series.aggregation === 'rawValues'),
    ).toBe(true);
  });

  it('checks Bar when Date Range is selected but lets the user switch back to line', () => {
    const { facade, store } = setup();
    const chartId = store.report().charts[0].chartId;

    facade.setGroupBy(chartId, 'all');
    expect(store.report().charts[0].pendingChartType).toBe('bar');

    facade.setPendingChartType(chartId, 'line');
    expect(store.report().charts[0].pendingChartType).toBe('line');
  });

  it('hides every chart control section when a saved story is retrieved', () => {
    const { facade, layout } = setup();

    const charts = facade.selectReport({
      _id: 'saved-story',
      createdAt: '2026-09-23T00:00:00.000Z',
      isPublic: false,
      publishedAt: null,
      likeCount: 0,
      name: 'Saved story',
      charts: [
        {
          name: 'Rain',
          comments: '',
          chartType: 'line',
          metricUnits: false,
          groupBy: 'year',
          seriesArray: [
            {
              title: '',
              location: {
                city: 'Raleigh',
                admin1: 'North Carolina',
                country: 'United States',
                latitude: 35.7796,
                longitude: -78.6382,
              },
              startDate: '2020-01-01',
              endDate: '2025-12-31',
              dateFilter: { unit: 'none', min: '', max: '' },
              measurement: 'rain_sum',
              comparison: 'none',
              threshold: null,
              aggregation: 'sum',
              avgFrequency: 'none',
              movingAverageWindow: null,
            },
          ],
        },
      ],
    });

    expect(charts.every((chart) => layout.controlsHidden(chart.chartId))).toBe(true);
  });
});
