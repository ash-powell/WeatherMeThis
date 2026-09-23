import { buildAnalysisRequest } from '../domain/analysis-request.builder';
import { buildReportRequest } from '../domain/report-request.builder';
import { ReportEditorStore } from './report-editor-store';

function preparedStore(): ReportEditorStore {
  const store = new ReportEditorStore();
  const chart = store.report().charts[0];
  const seriesId = chart.seriesInputs[0].seriesId;

  store.setReportName('Moving average test');
  store.updateChart(chart.chartId, (current) => ({ ...current, groupBy: 'year' }));
  store.updateSeries(chart.chartId, seriesId, (series) => ({
    ...series,
    city: 'Raleigh',
    admin1: 'North Carolina',
    country: 'United States',
    latitude: 35.7796,
    longitude: -78.6382,
    startDate: '2021-01-01',
    endDate: '2025-12-31',
    dateFilter: { unit: 'month', min: '06', max: '08' },
    measurement: 'rain_sum',
    aggregation: 'sum',
    avgFrequency: 'none',
    movingAverageWindow: 3,
  }));

  return store;
}

describe('Moving-average requests and saved stories', () => {
  it('adds each series window to its own analysis request', () => {
    const store = preparedStore();
    const chart = store.report().charts[0];
    const result = buildAnalysisRequest(chart.seriesInputs[0], chart.groupBy, chart.metricUnits);

    if (!result.ok) throw new Error(result.error);
    expect(result.value.movingAverageWindow).toBe(3);
  });

  it('allows one chart to contain primary, 3-point, and 5-point series', () => {
    const store = preparedStore();
    const chart = store.report().charts[0];
    const original = chart.seriesInputs[0];

    store.updateSeries(chart.chartId, original.seriesId, (series) => ({
      ...series,
      movingAverageWindow: null,
    }));
    store.addSeries(chart.chartId, original.seriesId, true);
    const threePoint = store.report().charts[0].seriesInputs[1];
    store.updateSeries(chart.chartId, threePoint.seriesId, (series) => ({
      ...series,
      movingAverageWindow: 3,
    }));
    store.addSeries(chart.chartId, threePoint.seriesId, true);
    const fivePoint = store.report().charts[0].seriesInputs[2];
    store.updateSeries(chart.chartId, fivePoint.seriesId, (series) => ({
      ...series,
      movingAverageWindow: 5,
    }));

    const currentChart = store.report().charts[0];
    const windows = currentChart.seriesInputs.map((series) => {
      const result = buildAnalysisRequest(series, currentChart.groupBy, currentChart.metricUnits);
      if (!result.ok) throw new Error(result.error);
      return result.value.movingAverageWindow;
    });

    expect(windows).toEqual([null, 3, 5]);
  });

  it('saves, loads, and rebuilds a series moving average', () => {
    const original = preparedStore();
    const saved = buildReportRequest(original.report());
    if (!saved.ok) throw new Error(saved.error);

    expect(saved.value.charts[0].seriesArray[0].movingAverageWindow).toBe(3);

    const loaded = new ReportEditorStore();
    loaded.loadReportCopy(saved.value, []);
    const chart = loaded.report().charts[0];
    const series = chart.seriesInputs[0];
    const rebuilt = buildAnalysisRequest(series, chart.groupBy, chart.metricUnits);

    if (!rebuilt.ok) throw new Error(rebuilt.error);
    expect(series.movingAverageWindow).toBe(3);
    expect(rebuilt.value.movingAverageWindow).toBe(3);
  });

  it('loads older reports without a series moving-average field as disabled', () => {
    const original = preparedStore();
    const saved = buildReportRequest(original.report());
    if (!saved.ok) throw new Error(saved.error);

    delete saved.value.charts[0].seriesArray[0].movingAverageWindow;
    const loaded = new ReportEditorStore();
    loaded.loadReportCopy(saved.value, []);

    expect(loaded.report().charts[0].seriesInputs[0].movingAverageWindow).toBeNull();
  });

  it('rejects an unsupported grouping or incompatible date filter', () => {
    const store = preparedStore();
    const chart = store.report().charts[0];
    const series = chart.seriesInputs[0];

    expect(buildAnalysisRequest(series, 'all', false).ok).toBe(false);
    expect(
      buildAnalysisRequest(
        { ...series, dateFilter: { unit: 'month', min: '01', max: '12' } },
        'yearMonth',
        false,
      ).ok,
    ).toBe(false);
  });
});
