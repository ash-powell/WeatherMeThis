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

  it('collapses and expands forms in only the selected chart', () => {
    const store = new ReportEditorStore();
    const firstChartId = store.report().charts[0].chartId;

    store.addChart(firstChartId);

    const secondChartId = store.report().charts[1].chartId;

    store.setChartSeriesExpanded(firstChartId, false);

    const collapsedReport = store.report();
    const firstChart = collapsedReport.charts.find(
      (chart) => chart.chartId === firstChartId,
    )!;
    const secondChart = collapsedReport.charts.find(
      (chart) => chart.chartId === secondChartId,
    )!;

    expect(
      firstChart.seriesInputs.every((series) => !series.expanded),
    ).toBe(true);

    expect(
      secondChart.seriesInputs.every((series) => series.expanded),
    ).toBe(true);
  });

  it('inserts a new chart immediately after the selected chart', () => {
    const store = new ReportEditorStore();
    const firstChartId = store.report().charts[0].chartId;

    store.addChart(firstChartId);

    const secondChartId = store.report().charts[1].chartId;

    store.addChart(firstChartId);

    expect(store.report().charts).toHaveLength(3);
    expect(store.report().charts[0].chartId).toBe(firstChartId);
    expect(store.report().charts[2].chartId).toBe(secondChartId);

    const insertedChart = store.report().charts[1];

    expect(insertedChart.chartId).not.toBe(firstChartId);
    expect(insertedChart.chartId).not.toBe(secondChartId);
  });


});
