import { buildGraphSeries } from '../../weather/domain/graph-series.builder';
import { buildAnalysisRequest } from '../domain/analysis-request.builder';
import { buildReportRequest } from '../domain/report-request.builder';
import { ReportEditorStore } from './report-editor-store';

function preparedStore(): ReportEditorStore {
  const store = new ReportEditorStore();
  const chart = store.report().charts[0];

  store.setReportName('Matching days test');
  store.updateChart(chart.chartId, (current) => ({ ...current, groupBy: 'all' }));
  store.updateSeries(chart.chartId, chart.seriesInputs[0].seriesId, (series) => ({
    ...series,
    city: 'Raleigh',
    admin1: 'North Carolina',
    country: 'United States',
    latitude: 35.7796,
    longitude: -78.6382,
    measurement: 'rain_sum',
    aggregation: 'avgMatchingDays',
    avgFrequency: 'monthly',
    comparison: '>',
    threshold: 0,
  }));

  return store;
}

describe('Average on Matching Days requests and saved stories', () => {
  it('always sends daily frequency', () => {
    const store = preparedStore();
    const chart = store.report().charts[0];
    const result = buildAnalysisRequest(chart.seriesInputs[0], chart.groupBy);

    if (!result.ok) throw new Error(result.error);
    expect(result.value.avgFrequency).toBe('daily');
  });

  it('loads a saved story and rebuilds its Average on Matching Days chart settings', () => {
    const original = preparedStore();
    const saved = buildReportRequest(original.report());
    if (!saved.ok) throw new Error(saved.error);

    expect(saved.value.charts[0].seriesArray[0].avgFrequency).toBe('daily');

    const loaded = new ReportEditorStore();
    loaded.loadReportCopy(saved.value, []);
    const loadedChart = loaded.report().charts[0];
    const loadedSeries = loadedChart.seriesInputs[0];
    const rebuilt = buildAnalysisRequest(loadedSeries, loadedChart.groupBy);
    if (!rebuilt.ok) throw new Error(rebuilt.error);

    expect(rebuilt.value.aggregation).toBe('avgMatchingDays');
    expect(rebuilt.value.avgFrequency).toBe('daily');
    expect(rebuilt.value.comparison).toBe('>');
    expect(buildGraphSeries(loadedSeries.seriesId, rebuilt.value, []).label).toContain(
      'Average on Matching Days',
    );
  });
});
