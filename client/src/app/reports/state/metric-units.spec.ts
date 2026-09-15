import { ReportEditorStore } from './report-editor-store';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { ReportFacade } from '../application/report-facade';
import { WeatherApi } from '../../weather/data-access/weather-api';
import type { GraphPoint } from '../../weather/models/graph.models';
import { buildReportRequest } from '../domain/report-request.builder';
import { buildAnalysisRequest } from '../domain/analysis-request.builder';
import { buildGraphSeries } from '../../weather/domain/graph-series.builder';
import { measurementNames, measurementUnit } from '../../weather/models/measurement.models';

function preparedStore(): ReportEditorStore {
  const store = new ReportEditorStore();
  const chart = store.report().charts[0];
  store.setReportName('Units test');
  store.updateChart(chart.chartId, (current) => ({ ...current, groupBy: 'all' }));
  store.updateSeries(chart.chartId, chart.seriesInputs[0].seriesId, (series) => ({
    ...series,
    city: 'Raleigh',
    country: 'United States',
    latitude: 35,
    longitude: -78,
    measurement: 'temperature_2m_max',
    aggregation: 'max',
    comparison: '>=',
    threshold: 32,
  }));
  return store;
}

describe('Metric chart units', () => {
  it('keeps an in-flight response when only the pending checkbox changes', () => {
    const store = preparedStore();
    const pending = new Subject<GraphPoint[]>();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: ReportEditorStore, useValue: store },
        { provide: WeatherApi, useValue: { analyze: () => pending.asObservable() } },
      ],
    });
    const facade = TestBed.inject(ReportFacade);
    const chart = store.report().charts[0];
    const series = chart.seriesInputs[0];
    const result = buildAnalysisRequest(series, chart.groupBy, false);
    if (!result.ok) throw new Error(result.error);
    facade
      .loadChartWeatherData(chart.chartId, [{ seriesId: series.seriesId, analysis: result.value }])
      .subscribe();
    store.setMetricUnits(true);
    pending.next([{ date: 'all', value: 90 }]);
    pending.complete();
    expect(store.report().charts[0].graphSeries[0].yAxisLabel).toContain('°F');
  });

  it('applies a pending chart type only when Get Data succeeds', () => {
    const store = preparedStore();
    const pending = new Subject<GraphPoint[]>();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: ReportEditorStore, useValue: store },
        { provide: WeatherApi, useValue: { analyze: () => pending.asObservable() } },
      ],
    });
    const facade = TestBed.inject(ReportFacade);
    const chart = store.report().charts[0];
    const series = chart.seriesInputs[0];
    const result = buildAnalysisRequest(series, chart.groupBy, false);
    if (!result.ok) throw new Error(result.error);

    facade
      .loadChartWeatherData(
        chart.chartId,
        [{ seriesId: series.seriesId, analysis: result.value }],
        'bar',
      )
      .subscribe();

    expect(store.report().charts[0].chartType).toBe('line');
    pending.next([{ date: 'all', value: 90 }]);
    pending.complete();
    expect(store.report().charts[0].chartType).toBe('bar');
  });

  it('saves the applied chart type instead of an unapplied pending Bar choice', () => {
    const store = preparedStore();
    const chart = store.report().charts[0];
    store.updateChart(chart.chartId, (current) => ({
      ...current,
      pendingChartType: 'bar',
    }));

    const result = buildReportRequest(store.report());
    if (!result.ok) throw new Error(result.error);

    expect(result.value.charts[0].chartType).toBe('line');
  });

  it('synchronizes the pending setting across charts without changing thresholds or plotted data', () => {
    const store = preparedStore();
    store.addChart();
    const chart = store.report().charts[0];
    store.updateChart(chart.chartId, (c) => ({
      ...c,
      graphSeries: [
        {
          seriesId: c.seriesInputs[0].seriesId,
          label: 'Old °F',
          yAxisId: 'temperature',
          yAxisLabel: '°F',
          points: [],
        },
      ],
    }));
    store.setMetricUnits(true);
    expect(store.report().charts[0].seriesInputs[0].threshold).toBe(32);
    expect(store.report().charts[0].seriesInputs[0].city).toBe('Raleigh');
    expect(store.report().charts[0].graphSeries[0].label).toBe('Old °F');
    expect(store.report().charts[1].metricUnits).toBe(true);
    store.addChart();
    expect(store.report().charts[2].metricUnits).toBe(true);
    store.setMetricUnits(false);
    expect(store.report().charts[0].seriesInputs[0].threshold).toBe(32);
  });

  it('retains metric settings through story building, loading, copies and draft restoration', () => {
    const store = preparedStore();
    store.setMetricUnits(true);
    const result = buildReportRequest(store.report());
    if (!result.ok) throw new Error(result.error);
    expect(result.value.charts[0].metricUnits).toBe(true);
    const copy = new ReportEditorStore();
    copy.loadReportCopy(result.value, []);
    expect(copy.report().charts[0].metricUnits).toBe(true);
    expect(copy.report().charts[0].seriesInputs[0].threshold).toBe(32);
    const draft = new ReportEditorStore();
    draft.restoreDraft(copy.report());
    expect(draft.report().charts[0].metricUnits).toBe(true);
    draft.reset();
    expect(draft.report().charts[0].metricUnits).toBe(false);
  });

  it('builds correctly labelled unit axes for every measurement and keeps counts unitless', () => {
    const store = preparedStore();
    const chart = store.report().charts[0];
    for (const measurement of measurementNames) {
      for (const metric of [false, true]) {
        const result = buildAnalysisRequest(
          { ...chart.seriesInputs[0], measurement },
          chart.groupBy,
          metric,
        );
        if (!result.ok) throw new Error(result.error);
        const graph = buildGraphSeries(1, result.value, []);
        expect(graph.yAxisLabel).toContain(measurementUnit(measurement, metric));
        const count = buildGraphSeries(1, { ...result.value, aggregation: 'count' }, []);
        expect(count.yAxisLabel).toBe('Count');
      }
    }
  });

  it('lets a newer Get Data replace an older request without mixing results', () => {
    const store = preparedStore();
    const oldRequest = new Subject<GraphPoint[]>();
    const newRequest = new Subject<GraphPoint[]>();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: ReportEditorStore, useValue: store },
        {
          provide: WeatherApi,
          useValue: {
            analyze: (analysis: { metricUnits?: boolean }) =>
              analysis.metricUnits ? newRequest.asObservable() : oldRequest.asObservable(),
          },
        },
      ],
    });
    const facade = TestBed.inject(ReportFacade);
    const chart = store.report().charts[0];
    const series = chart.seriesInputs[0];
    const oldResult = buildAnalysisRequest(series, chart.groupBy, false);
    const newResult = buildAnalysisRequest(series, chart.groupBy, true);
    if (!oldResult.ok || !newResult.ok) throw new Error('Invalid test setup');
    facade
      .loadChartWeatherData(chart.chartId, [
        { seriesId: series.seriesId, analysis: oldResult.value },
      ])
      .subscribe();
    store.setMetricUnits(true);
    facade
      .loadChartWeatherData(chart.chartId, [
        { seriesId: series.seriesId, analysis: newResult.value },
      ])
      .subscribe();
    newRequest.next([{ date: 'all', value: 20 }]);
    newRequest.complete();
    oldRequest.next([{ date: 'all', value: 68 }]);
    oldRequest.complete();
    expect(store.report().charts[0].graphSeries[0].points[0].value).toBe(20);
    expect(store.report().charts[0].graphSeries[0].yAxisLabel).toContain('°C');
  });
});
