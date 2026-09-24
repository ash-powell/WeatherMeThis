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
    const firstChart = collapsedReport.charts.find((chart) => chart.chartId === firstChartId)!;
    const secondChart = collapsedReport.charts.find((chart) => chart.chartId === secondChartId)!;

    expect(firstChart.seriesInputs.every((series) => !series.expanded)).toBe(true);

    expect(secondChart.seriesInputs.every((series) => series.expanded)).toBe(true);
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

  it('autopopulates a new chart from the selected chart without copying rendered data', () => {
    const store = new ReportEditorStore();
    const sourceChart = store.report().charts[0];
    const sourceSeries = sourceChart.seriesInputs[0];

    store.updateChart(sourceChart.chartId, (chart) => ({
      ...chart,
      name: 'Source chart',
      comments: 'Source comments',
      chartType: 'bar',
      pendingChartType: 'bar',
      groupBy: 'year',
      graphSeries: [
        {
          seriesId: sourceSeries.seriesId,
          label: 'Rendered source',
          yAxisId: 'rain_sum',
          yAxisLabel: 'Rain (inch)',
          requestKey: 'source-request',
          points: [{ date: '2025', value: 42 }],
        },
      ],
    }));
    store.updateSeries(sourceChart.chartId, sourceSeries.seriesId, (series) => ({
      ...series,
      city: 'Raleigh',
      measurement: 'rain_sum',
      aggregation: 'sum',
      title: 'Rainfall',
    }));

    store.addChart(sourceChart.chartId, true);

    const populated = store.report().charts[1];
    expect(populated.name).toBe('');
    expect(populated.comments).toBe('');
    expect(populated.chartType).toBe('bar');
    expect(populated.groupBy).toBe('year');
    expect(populated.graphSeries).toEqual([]);
    expect(populated.seriesInputs).toHaveLength(1);
    expect(populated.seriesInputs[0].seriesId).not.toBe(sourceSeries.seriesId);
    expect(populated.seriesInputs[0].city).toBe('Raleigh');
    expect(populated.seriesInputs[0].measurement).toBe('rain_sum');
    expect(populated.seriesInputs[0].aggregation).toBe('sum');
    expect(populated.seriesInputs[0].title).toBe('Rainfall');
  });

  it('moves series and keeps rendered chart series in the same order', () => {
    const store = new ReportEditorStore();
    const chart = store.report().charts[0];
    const first = chart.seriesInputs[0];
    store.addSeries(chart.chartId, first.seriesId, false);
    const second = store.report().charts[0].seriesInputs[1];

    store.updateChart(chart.chartId, (current) => ({
      ...current,
      graphSeries: [
        {
          seriesId: first.seriesId,
          label: 'First',
          yAxisId: 'temperature_2m_max',
          yAxisLabel: 'Temperature (°F)',
          requestKey: 'first',
          points: [],
        },
        {
          seriesId: second.seriesId,
          label: 'Second',
          yAxisId: 'rain_sum',
          yAxisLabel: 'Rain (inch)',
          requestKey: 'second',
          points: [],
        },
      ],
    }));

    store.moveSeries(chart.chartId, second.seriesId, -1);

    expect(store.report().charts[0].seriesInputs.map((series) => series.seriesId)).toEqual([
      second.seriesId,
      first.seriesId,
    ]);
    expect(store.report().charts[0].graphSeries.map((series) => series.seriesId)).toEqual([
      second.seriesId,
      first.seriesId,
    ]);

    store.moveSeries(chart.chartId, second.seriesId, -1);
    store.moveSeries(chart.chartId, first.seriesId, 1);
    store.moveSeries(chart.chartId, -99, 1);

    expect(store.report().charts[0].seriesInputs.map((series) => series.seriesId)).toEqual([
      second.seriesId,
      first.seriesId,
    ]);
  });
});
