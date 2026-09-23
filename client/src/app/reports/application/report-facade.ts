import { inject, Injectable, signal } from '@angular/core';
import { forkJoin, map, tap } from 'rxjs';

import { LocationApi } from '../../locations/data-access/location-api';
import type { LocationResponse, QueryLocation } from '../../locations/models/location.models';

import { WeatherApi } from '../../weather/data-access/weather-api';
import { buildGraphSeries } from '../../weather/domain/graph-series.builder';
import type { Aggregation, AnalysisRequest, GroupBy } from '../../weather/models/analysis.models';
import type { ChartType } from '../../weather/models/chart.models';
import type { GraphPoint } from '../../weather/models/graph.models';

import { ReportApi } from '../data-access/report-api';
import type { SaveReportResponse } from '../data-access/report-api';
import type {
  ChartInput,
  DateFilterField,
  ReportInput,
  SeriesInput,
  SharedSeriesField,
} from '../models/report-editor.models';
import type { ReportRequest, SavedReport } from '../models/report.models';
import { ReportEditorStore } from '../state/report-editor-store';
import { ReportLayoutState } from '../state/report-layout-state';

import type { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ReportFacade {
  private readonly reportApi = inject(ReportApi);

  private readonly reportEditorStore = inject(ReportEditorStore);

  private readonly reportLayoutState = inject(ReportLayoutState);

  private readonly locationApi = inject(LocationApi);

  private readonly weatherApi = inject(WeatherApi);

  private readonly savedReportsState = signal<SavedReport[]>([]);

  private readonly reportIdState = signal<string | null>(null);

  private readonly selectedReportIsPublicState = signal(false);

  private readonly loadedStoryNameState = signal<string | null>(null);

  readonly report = this.reportEditorStore.report.asReadonly();

  readonly savedReports = this.savedReportsState.asReadonly();

  readonly reportId = this.reportIdState.asReadonly();

  readonly selectedReportIsPublic = this.selectedReportIsPublicState.asReadonly();

  readonly loadedStoryName = this.loadedStoryNameState.asReadonly();

  selectReport(saved: SavedReport): ChartInput[] {
    this.latestWeatherRequest.clear();
    const charts = this.reportEditorStore.loadSavedReport(saved);
    this.reportLayoutState.hideControls(charts.map((chart) => chart.chartId));

    this.reportIdState.set(saved._id);
    this.selectedReportIsPublicState.set(saved.isPublic === true);
    this.loadedStoryNameState.set(saved.name);
    this.savedReportsState.set([]);

    return charts;
  }

  openReportCopy(report: ReportRequest, renderedCharts: ChartInput[]): ChartInput[] {
    this.latestWeatherRequest.clear();
    const charts = this.reportEditorStore.loadReportCopy(report, renderedCharts);
    this.reportLayoutState.hideControls(charts.map((chart) => chart.chartId));

    this.reportIdState.set(null);
    this.selectedReportIsPublicState.set(false);
    this.loadedStoryNameState.set(null);
    this.savedReportsState.set([]);

    return charts;
  }

  loadSavedReports(): Observable<SavedReport[]> {
    return this.reportApi.getAll().pipe(
      tap((reports) => {
        this.savedReportsState.set(reports);
      }),
    );
  }

  saveReport(request: ReportRequest): Observable<SaveReportResponse> {
    return this.reportApi.save(request).pipe(
      tap((response) => {
        this.reportIdState.set(response.insertedId);
        this.selectedReportIsPublicState.set(false);
        this.loadedStoryNameState.set(request.name);
      }),
    );
  }

  updateSelectedReport(request: ReportRequest): Observable<unknown> {
    return this.reportApi.update(this.requireSelectedReportId(), request).pipe(
      tap(() => {
        this.loadedStoryNameState.set(request.name);
      }),
    );
  }

  deleteSelectedReport(): Observable<unknown> {
    const reportId = this.requireSelectedReportId();

    return this.reportApi.delete(reportId).pipe(
      tap(() => {
        this.savedReportsState.update((current) =>
          current.filter((report) => report._id !== reportId),
        );

        this.reportIdState.set(null);
        this.selectedReportIsPublicState.set(false);
        this.loadedStoryNameState.set(null);
      }),
    );
  }

  searchLocations(
    chartId: number,
    seriesId: number,
    searchText: string,
  ): Observable<LocationResponse> {
    return this.locationApi.search(searchText).pipe(
      tap((data) => {
        this.reportEditorStore.updateSeries(chartId, seriesId, (current) => ({
          ...current,
          locations: data.results ?? [],
        }));
      }),
    );
  }

  selectLocation(chartId: number, seriesId: number, location: QueryLocation): void {
    this.reportEditorStore.updateSeries(chartId, seriesId, (series) => ({
      ...series,
      latitude: location.latitude,
      longitude: location.longitude,
      city: location.name,
      admin1: location.admin1 ?? null,
      country: location.country,
      locations: [],
    }));
  }

  private nextWeatherRequest = 0;
  private readonly latestWeatherRequest = new Map<number, number>();

  loadChartWeatherData(
    chartId: number,
    requests: Array<{ seriesId: number; analysis: AnalysisRequest }>,
    chartType?: ChartType,
  ): Observable<boolean> {
    const requestId = ++this.nextWeatherRequest;
    this.latestWeatherRequest.set(chartId, requestId);
    return forkJoin(requests.map((request) => this.weatherApi.analyze(request.analysis))).pipe(
      map((results) => {
        if (this.latestWeatherRequest.get(chartId) !== requestId) return false;

        let chartWasBuilt = false;

        this.reportEditorStore.updateChart(chartId, (chart) => {
          if (
            chart.seriesInputs.length !== requests.length ||
            !requests.every((request) =>
              chart.seriesInputs.some((series) => series.seriesId === request.seriesId),
            )
          )
            return chart;

          chartWasBuilt = true;

          // Replace the whole chart together; never mix partially loaded unit systems.
          return {
            ...chart,
            chartType: chartType ?? chart.chartType,
            graphSeries: results.map((points, index) =>
              buildGraphSeries(
                requests[index].seriesId,
                requests[index].analysis,
                points,
                chart.seriesInputs.find((series) => series.seriesId === requests[index].seriesId)
                  ?.title,
              ),
            ),
          };
        });

        return chartWasBuilt;
      }),
    );
  }

  restoreDraft(report: ReportInput, reportId: string | null, loadedStoryName: string | null): void {
    this.latestWeatherRequest.clear();
    this.reportEditorStore.restoreDraft(report);
    this.reportIdState.set(reportId);
    this.selectedReportIsPublicState.set(false);
    this.loadedStoryNameState.set(loadedStoryName);
  }

  resetEditor(): void {
    this.latestWeatherRequest.clear();
    this.reportEditorStore.reset();
    this.reportIdState.set(null);
    this.selectedReportIsPublicState.set(false);
    this.loadedStoryNameState.set(null);
    this.savedReportsState.set([]);
    this.reportLayoutState.showAllControls();
  }

  setSelectedReportPublication(isPublic: boolean): void {
    this.selectedReportIsPublicState.set(isPublic);
  }

  setReportName(name: string): void {
    this.reportEditorStore.setReportName(name);
  }

  setChartName(chartId: number, name: string): void {
    this.reportEditorStore.setChartName(chartId, name);
  }

  setChartComments(chartId: number, comments: string): void {
    this.reportEditorStore.setChartComments(chartId, comments);
  }

  setPendingChartType(chartId: number, chartType: ChartType): void {
    this.reportEditorStore.updateChart(chartId, (chart) => ({
      ...chart,
      pendingChartType: chartType,
    }));
  }

  setMetricUnits(metricUnits: boolean): void {
    this.reportEditorStore.setMetricUnits(metricUnits);
  }

  closeSavedReports(): void {
    this.savedReportsState.set([]);
  }

  setChartSeriesExpanded(chartId: number, expanded: boolean): void {
    this.reportEditorStore.setChartSeriesExpanded(chartId, expanded);
  }

  moveChart(chartId: number, direction: -1 | 1): void {
    this.reportEditorStore.moveChart(chartId, direction);
  }

  addChart(afterChartId?: number): number | null {
    return this.reportEditorStore.addChart(afterChartId);
  }

addSeries(chartId: number, sourceSeriesId: number, autopopulate: boolean,): number | null {
  return this.reportEditorStore.addSeries(chartId, sourceSeriesId, autopopulate,);
}

  setChartWideEdit(chartId: number, enabled: boolean): void {
    this.reportEditorStore.setChartWideEdit(chartId, enabled);
  }

  setSeriesTitle(chartId: number, seriesId: number, title: string): void {
    this.reportEditorStore.updateSeries(chartId, seriesId, (series) => ({ ...series, title }));
  }

  setSharedSeriesField<K extends SharedSeriesField>(
    chartId: number,
    seriesId: number,
    field: K,
    value: SeriesInput[K],
  ): void {
    this.reportEditorStore.setSharedSeriesField(chartId, seriesId, field, value);
  }

  setAggregation(chartId: number, seriesId: number, aggregation: Aggregation | null): void {
    if (aggregation !== 'rawValues') {
      this.reportEditorStore.setSharedSeriesField(chartId, seriesId, 'aggregation', aggregation);
      return;
    }

    // Exact dates and raw values are a paired chart-wide rule. Because Date Groups
    // is shared by every series in a chart, keep every series compatible with it.
    this.reportEditorStore.updateChart(chartId, (chart) => ({
      ...chart,
      groupBy: 'yearMonthDay',
      seriesInputs: chart.seriesInputs.map((series) => ({
        ...series,
        aggregation: 'rawValues',
        avgFrequency: 'none',
      })),
    }));
  }

  setDateFilterField<K extends DateFilterField>(
    chartId: number,
    seriesId: number,
    field: K,
    value: SeriesInput['dateFilter'][K],
  ): void {
    this.reportEditorStore.setDateFilterField(chartId, seriesId, field, value);
  }

  deleteSeries(chartId: number, seriesId: number): boolean {
    return this.reportEditorStore.deleteSeries(chartId, seriesId);
  }

  deleteChart(chartId: number): boolean {
    return this.reportEditorStore.deleteChart(chartId);
  }

  setGroupBy(chartId: number, groupBy: GroupBy | null): void {
    this.reportEditorStore.updateChart(chartId, (chart) => ({
      ...chart,
      groupBy,
      pendingChartType: groupBy === 'all' ? 'bar' : chart.pendingChartType,
      seriesInputs: chart.seriesInputs.map((series) => ({
        ...series,
        aggregation: groupBy === 'yearMonthDay' ? 'rawValues' : series.aggregation,
        avgFrequency: groupBy === 'yearMonthDay' ? 'none' : series.avgFrequency,
        movingAverageWindow:
          groupBy === 'year' || groupBy === 'yearMonth' || groupBy === 'yearMonthDay'
            ? series.movingAverageWindow
            : null,
      })),
    }));
  }

  setMovingAverageWindow(
    chartId: number,
    seriesId: number,
    movingAverageWindow: number | null,
  ): void {
    this.reportEditorStore.updateSeries(chartId, seriesId, (series) => ({
      ...series,
      movingAverageWindow,
    }));
  }

  setSeriesExpanded(chartId: number, seriesId: number, expanded: boolean): void {
    this.reportEditorStore.updateSeries(chartId, seriesId, (series) => ({
      ...series,
      expanded,
    }));
  }

  private requireSelectedReportId(): string {
    const reportId = this.reportIdState();

    if (!reportId) {
      throw new Error('No saved story is selected');
    }

    return reportId;
  }
}
