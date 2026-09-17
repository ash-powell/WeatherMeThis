import { Injectable, signal } from '@angular/core';

import type {
  ChartInput,
  DateFilterField,
  ReportInput,
  SeriesInput,
  SharedSeriesField,
} from '../models/report-editor.models';

import type { ReportRequest, SavedReport } from '../models/report.models';

@Injectable({
  providedIn: 'root',
})
export class ReportEditorStore {
  private nextSeriesId = 1;
  private nextChartId = 1;

  readonly report = signal<ReportInput>({
    name: '',
    charts: [this.createChartInput()],
  });

  private createSeriesInput(): SeriesInput {
    return {
      seriesId: this.nextSeriesId++,
      expanded: true,

      city: null,
      admin1: null,
      country: null,
      latitude: null,
      longitude: null,
      locations: [],
      locationSearch: '',

      startDate: '2020-01-01',
      endDate: '2025-12-31',

      dateFilter: {
        unit: 'none',
        min: '',
        max: '',
      },

      measurement: null,
      aggregation: null,
      avgFrequency: 'none',
      comparison: 'none',
      threshold: null,
      title: '',
    };
  }

  private createChartInput(): ChartInput {
    return {
      chartId: this.nextChartId++,
      name: '',
      comments: '',
      chartType: 'line',
      pendingChartType: 'line',
      metricUnits: false,
      groupBy: null,
      chartWideEdit: false,
      seriesInputs: [this.createSeriesInput()],
      graphSeries: [],
    };
  }

  updateChart(chartId: number, updater: (chart: ChartInput) => ChartInput): void {
    this.report.update((current) => ({
      ...current,

      charts: current.charts.map((chart) => (chart.chartId === chartId ? updater(chart) : chart)),
    }));
  }

  updateSeries(
    chartId: number,
    seriesId: number,
    updater: (series: SeriesInput) => SeriesInput,
  ): void {
    this.updateChart(chartId, (chart) => ({
      ...chart,

      seriesInputs: chart.seriesInputs.map((series) =>
        series.seriesId === seriesId ? updater(series) : series,
      ),
    }));
  }

  setReportName(name: string): void {
    this.report.update((current) => ({
      ...current,
      name,
    }));
  }

  setChartName(chartId: number, name: string): void {
    this.updateChart(chartId, (chart) => ({
      ...chart,
      name,
    }));
  }

  setChartComments(chartId: number, comments: string): void {
    this.updateChart(chartId, (chart) => ({
      ...chart,
      comments,
    }));
  }

  setChartSeriesExpanded(chartId: number, expanded: boolean): void {
    this.updateChart(chartId, (chart) => ({
      ...chart,

      seriesInputs: chart.seriesInputs.map((series) => ({
        ...series,
        expanded,
      })),
    }));
  }

  moveChart(chartId: number, direction: -1 | 1): void {
    this.report.update((report) => {
      const index = report.charts.findIndex((chart) => chart.chartId === chartId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= report.charts.length) return report;
      const charts = [...report.charts];
      [charts[index], charts[target]] = [charts[target], charts[index]];
      return { ...report, charts };
    });
  }

  addChart(afterChartId?: number): void {
    this.report.update((current) => {
      const sourceIndex =
        afterChartId === undefined
          ? current.charts.length - 1
          : current.charts.findIndex(
              (chart) => chart.chartId === afterChartId,
            );

      if (sourceIndex < 0 && current.charts.length > 0) {return current;}

      const sourceChart = current.charts[sourceIndex];

      const newChart = {
        ...this.createChartInput(),
        metricUnits: sourceChart?.metricUnits ?? false,
      };

      const charts = [...current.charts];

      charts.splice(sourceIndex + 1, 0, newChart);

      return {...current, charts,};
    });
  }

  addSeries(chartId: number, sourceSeriesId: number, autopopulate: boolean): void {
    this.updateChart(chartId, (chart) => {
      let newSeries: SeriesInput;

      if (autopopulate && chart.seriesInputs.length > 0) {
        const source = chart.seriesInputs.find((series) => series.seriesId === sourceSeriesId);

        newSeries = source
          ? {
              ...source,
              seriesId: this.nextSeriesId++,
              expanded: true,
              dateFilter: {
                ...source.dateFilter,
              },
              locations: [],
            }
          : this.createSeriesInput();
      } else {
        newSeries = this.createSeriesInput();
      }

      return {
        ...chart,

        seriesInputs: [...chart.seriesInputs, newSeries],
      };
    });
  }

  setMetricUnits(metricUnits: boolean): void {
    this.report.update((report) => ({
      ...report,
      charts: report.charts.map((chart) => ({ ...chart, metricUnits })),
    }));
  }

  setChartWideEdit(chartId: number, enabled: boolean): void {
    this.updateChart(chartId, (chart) => ({
      ...chart,
      chartWideEdit: enabled,
    }));
  }

  setSharedSeriesField<K extends SharedSeriesField>(
    chartId: number,
    seriesId: number,
    field: K,
    value: SeriesInput[K],
  ): void {
    this.updateChart(chartId, (chart) => ({
      ...chart,
      seriesInputs: chart.seriesInputs.map((series) =>
        chart.chartWideEdit || series.seriesId === seriesId
          ? {
              ...series,
              [field]: value,
            }
          : series,
      ),
    }));
  }

  setDateFilterField<K extends DateFilterField>(
    chartId: number,
    seriesId: number,
    field: K,
    value: SeriesInput['dateFilter'][K],
  ): void {
    this.updateChart(chartId, (chart) => ({
      ...chart,
      seriesInputs: chart.seriesInputs.map((series) =>
        chart.chartWideEdit || series.seriesId === seriesId
          ? {
              ...series,
              dateFilter: {
                ...series.dateFilter,
                [field]: value,
              },
            }
          : series,
      ),
    }));
  }

  deleteSeries(chartId: number, seriesId: number): boolean {
    const chart = this.report().charts.find((candidate) => candidate.chartId === chartId);

    if (!chart || chart.seriesInputs.length === 1) {
      return false;
    }

    this.updateChart(chartId, (current) => ({
      ...current,

      seriesInputs: current.seriesInputs.filter((series) => series.seriesId !== seriesId),

      graphSeries: current.graphSeries.filter((series) => series.seriesId !== seriesId),
    }));

    return true;
  }

  deleteChart(chartId: number): boolean {
    if (this.report().charts.length === 1) {
      return false;
    }

    this.report.update((current) => ({
      ...current,

      charts: current.charts.filter((chart) => chart.chartId !== chartId),
    }));

    return true;
  }

  reset(): void {
    this.nextSeriesId = 1;
    this.nextChartId = 1;
    this.report.set({
      name: '',
      charts: [this.createChartInput()],
    });
  }

  restoreDraft(report: ReportInput): void {
    const restoredReport: ReportInput = {
      ...report,
      charts: report.charts.map((chart) => ({
        ...chart,
        chartType: chart.chartType ?? 'line',
        pendingChartType: chart.pendingChartType ?? chart.chartType ?? 'line',
        metricUnits: chart.metricUnits === true,
        chartWideEdit: chart.chartWideEdit === true,
      })),
    };

    this.report.set(restoredReport);
    this.synchronizeNextIds(restoredReport);
  }

  loadSavedReport(saved: SavedReport): ChartInput[] {
    return this.loadReportCopy(saved, []);
  }

  loadReportCopy(report: ReportRequest, renderedCharts: ChartInput[]): ChartInput[] {
    const charts: ChartInput[] = report.charts.map((savedChart, chartIndex) => {
      const seriesInputs = savedChart.seriesArray.map((series) => ({
        seriesId: this.nextSeriesId++,
        expanded: false,

        city: series.location.city,
        admin1: series.location.admin1,
        country: series.location.country,
        latitude: series.location.latitude,
        longitude: series.location.longitude,
        locations: [],
        locationSearch: series.location.city,

        startDate: series.startDate,
        endDate: series.endDate,

        dateFilter: {
          ...series.dateFilter,
        },

        measurement: series.measurement,
        aggregation: series.aggregation,
        avgFrequency: series.avgFrequency,
        comparison: series.comparison,
        threshold: series.threshold,
        title: series.title ?? '',
      }));

      const graphSeries =
        renderedCharts[chartIndex]?.graphSeries.map((series, seriesIndex) => ({
          ...series,
          seriesId: seriesInputs[seriesIndex]?.seriesId ?? series.seriesId,
        })) ?? [];

      return {
        chartId: this.nextChartId++,
        name: savedChart.name ?? '',
        comments: savedChart.comments ?? '',
        chartType: savedChart.chartType ?? 'line',
        pendingChartType: savedChart.chartType ?? 'line',
        metricUnits: savedChart.metricUnits === true,
        groupBy: savedChart.groupBy,
        chartWideEdit: false,
        graphSeries,
        seriesInputs,
      };
    });

    this.report.set({
      name: report.name,
      charts,
    });

    return charts;
  }

  private synchronizeNextIds(report: ReportInput): void {
    this.nextChartId = Math.max(0, ...report.charts.map((chart) => chart.chartId)) + 1;

    this.nextSeriesId =
      Math.max(
        0,
        ...report.charts.flatMap((chart) => chart.seriesInputs.map((series) => series.seriesId)),
      ) + 1;
  }
}
