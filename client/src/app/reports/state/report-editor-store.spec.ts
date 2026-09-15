import { ReportEditorStore } from './report-editor-store';

describe('Report editor ordering and expansion', () => {
  it('resets the pending chart type with a fresh chart', () => {
    const store = new ReportEditorStore();
    const chart = store.report().charts[0];
    store.updateChart(chart.chartId, (current) => ({
      ...current,
      pendingChartType: 'bar',
    }));

    store.reset();

    expect(store.report().charts[0].chartType).toBe('line');
    expect(store.report().charts[0].pendingChartType).toBe('line');
  });

  it('moves a whole chart, preserving its identity and series, and ignores boundaries', () => {
    const store = new ReportEditorStore();
    store.addChart();
    store.addChart();
    const [first, second, third] = store.report().charts;
    store.moveChart(second.chartId, -1);
    expect(store.report().charts).toEqual([second, first, third]);
    expect(store.report().charts[0]).toBe(second);
    store.moveChart(second.chartId, -1);
    expect(store.report().charts).toEqual([second, first, third]);
    store.moveChart(second.chartId, 1);
    store.moveChart(third.chartId, 1);
    store.moveChart(-99, 1);
    expect(store.report().charts).toEqual([first, second, third]);
  });

  it('collapses and expands every chart without changing form values', () => {
    const store = new ReportEditorStore();
    store.addChart();
    const before = store.report().charts;
    store.setAllSeriesExpanded(false);
    expect(store.report().charts.every((c) => c.seriesInputs.every((s) => !s.expanded))).toBe(true);
    store.setAllSeriesExpanded(true);
    expect(store.report().charts).toEqual(before);
  });
});
