import { buildReportRequest } from '../domain/report-request.builder';
import { buildAnalysisRequest } from '../domain/analysis-request.builder';
import { ReportEditorStore } from './report-editor-store';
import { analysisRequestKey } from '../../weather/domain/analysis-request-key';

function currentRequestKey(
  store: ReportEditorStore,
  chartIndex: number,
  seriesIndex: number,
): string {
  const chart = store.report().charts[chartIndex];
  const series = chart.seriesInputs[seriesIndex];
  const result = buildAnalysisRequest(series, chart.groupBy, chart.metricUnits);

  if (!result.ok) throw new Error(result.error);
  return analysisRequestKey(result.value);
}

function preparedStore(): ReportEditorStore {
  const store = new ReportEditorStore();
  const chart = store.report().charts[0];
  const series = chart.seriesInputs[0];

  store.setReportName('Stored results');
  store.updateChart(chart.chartId, (current) => ({ ...current, groupBy: 'year' }));
  store.updateSeries(chart.chartId, series.seriesId, (current) => ({
    ...current,
    city: 'Raleigh',
    admin1: 'North Carolina',
    country: 'United States',
    latitude: 35.7796,
    longitude: -78.6382,
    measurement: 'rain_sum',
    aggregation: 'sum',
    avgFrequency: 'none',
    comparison: 'none',
    threshold: null,
  }));

  return store;
}

describe('Stored report chart results', () => {
  it('serializes completed series and keeps unfinished series as null', () => {
    const store = preparedStore();
    const chart = store.report().charts[0];
    const firstSeries = chart.seriesInputs[0];
    store.addSeries(chart.chartId, firstSeries.seriesId, true);

    store.updateChart(chart.chartId, (current) => ({
      ...current,
      graphSeries: [
        {
          seriesId: firstSeries.seriesId,
          label: 'Raleigh rain',
          yAxisId: 'rain_sum',
          yAxisLabel: 'Rain (inch)',
          requestKey: currentRequestKey(store, 0, 0),
          points: [
            { date: '2024', value: 42.5 },
            { date: '2025', value: null },
          ],
        },
      ],
    }));

    const result = buildReportRequest(store.report());
    if (!result.ok) throw new Error(result.error);

    expect(result.value.charts[0].renderedSeries).toEqual([
      {
        label: 'Raleigh rain',
        yAxisId: 'rain_sum',
        yAxisLabel: 'Rain (inch)',
        requestKey: currentRequestKey(store, 0, 0),
        dates: ['2024', '2025'],
        values: [42.5, null],
      },
      null,
    ]);
  });

  it('restores a later completed series in its original series position', () => {
    const original = preparedStore();
    const sourceChart = original.report().charts[0];
    const firstSeries = sourceChart.seriesInputs[0];
    original.addSeries(sourceChart.chartId, firstSeries.seriesId, true);
    const secondSeries = original.report().charts[0].seriesInputs[1];

    original.updateChart(sourceChart.chartId, (current) => ({
      ...current,
      graphSeries: [
        {
          seriesId: secondSeries.seriesId,
          label: 'Second series only',
          yAxisId: 'rain_sum',
          yAxisLabel: 'Rain (inch)',
          requestKey: currentRequestKey(original, 0, 1),
          points: [{ date: '2025', value: 21.4 }],
        },
      ],
    }));

    const saved = buildReportRequest(original.report());
    if (!saved.ok) throw new Error(saved.error);

    const loaded = new ReportEditorStore();
    loaded.loadSavedReport({
      ...saved.value,
      _id: 'partial-story',
      createdAt: '2026-09-24T00:00:00.000Z',
      isPublic: false,
      publishedAt: null,
      likeCount: 0,
    });

    const loadedChart = loaded.report().charts[0];
    expect(loadedChart.graphSeries).toHaveLength(1);
    expect(loadedChart.graphSeries[0].seriesId).toBe(loadedChart.seriesInputs[1].seriesId);
    expect(loadedChart.graphSeries[0].label).toBe('Second series only');
  });

  it('does not save chart points after their calculation controls become stale', () => {
    const store = preparedStore();
    const chart = store.report().charts[0];
    const series = chart.seriesInputs[0];

    store.updateChart(chart.chartId, (current) => ({
      ...current,
      graphSeries: [
        {
          seriesId: series.seriesId,
          label: 'Raleigh rain',
          yAxisId: 'rain_sum',
          yAxisLabel: 'Rain (inch)',
          requestKey: currentRequestKey(store, 0, 0),
          points: [{ date: '2025', value: 42.5 }],
        },
      ],
    }));

    store.updateSeries(chart.chartId, series.seriesId, (current) => ({
      ...current,
      comparison: '>=',
      threshold: 1,
    }));

    const result = buildReportRequest(store.report());
    if (!result.ok) throw new Error(result.error);

    expect(result.value.charts[0].renderedSeries).toEqual([null]);
  });
});
