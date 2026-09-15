import { ReportEditorStore } from './report-editor-store';
import { buildReportRequest } from '../domain/report-request.builder';
import { buildAnalysisRequest } from '../domain/analysis-request.builder';
import { buildGraphSeries } from '../../weather/domain/graph-series.builder';

describe('Optional series titles', () => {
  it('uses a custom legend title and falls back for empty or whitespace-only titles', () => {
    const store = new ReportEditorStore();
    const chart = store.report().charts[0];
    store.updateChart(chart.chartId, (c) => ({ ...c, groupBy: 'all' }));
    store.updateSeries(chart.chartId, chart.seriesInputs[0].seriesId, (s) => ({
      ...s,
      city: 'Raleigh',
      country: 'United States',
      latitude: 35,
      longitude: -78,
      startDate: '2020-01-01',
      endDate: '2020-12-31',
      measurement: 'temperature_2m_max',
      aggregation: 'max',
      comparison: 'none',
      title: '  My hot days  ',
    }));
    const series = store.report().charts[0].seriesInputs[0];
    const result = buildAnalysisRequest(series, 'all');
    if (!result.ok) throw new Error(result.error);
    expect(buildGraphSeries(1, result.value, [], series.title).label).toBe('My hot days');
    const defaultLabel = buildGraphSeries(1, result.value, []).label;
    expect(defaultLabel).toContain('Raleigh');
    expect(buildGraphSeries(1, result.value, [], '   ').label).toBe(defaultLabel);
    store.setReportName('Title test');
    const report = buildReportRequest(store.report());
    if (!report.ok) throw new Error(report.error);
    expect(report.value.charts[0].seriesArray[0].title).toBe('My hot days');
    const copy = new ReportEditorStore();
    copy.loadReportCopy(report.value, []);
    expect(copy.report().charts[0].seriesInputs[0].title).toBe('My hot days');
    const draft = new ReportEditorStore();
    draft.restoreDraft(copy.report());
    expect(draft.report().charts[0].seriesInputs[0].title).toBe('My hot days');
  });
});
