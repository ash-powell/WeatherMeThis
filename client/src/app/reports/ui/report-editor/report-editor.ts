import { measurementOptions, measurementUnit } from '../../../weather/models/measurement.models';
import { Component, inject, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ReportFacade } from '../../application/report-facade';
import { DialogService } from '../../../shared/application/dialog.service';

import { ReportHelpDialog } from '../report-help-dialog/report-help-dialog';

import type {
  HelpTopic,
  ReportInput,
  SeriesInput,
  SharedSeriesField,
  DateFilterField,
} from '../../models/report-editor.models';

import type { ChartType } from '../../../weather/models/chart.models';

import type { QueryLocation } from '../../../locations/models/location.models';

import type { Aggregation, GroupBy } from '../../../weather/models/analysis.models';

import { ReportCharts } from '../report-charts/report-charts';

import { ReportLayoutState } from '../../state/report-layout-state';

export interface SeriesRequest {
  chartId: number;
  series: SeriesInput;
}

export interface ChartDataRequest {
  chartId: number;
  chartType: ChartType;
}

@Component({
  selector: 'app-report-editor',
  imports: [FormsModule, ReportHelpDialog, ReportCharts],
  templateUrl: './report-editor.html',
  styleUrl: './report-editor.scss',
})
export class ReportEditor {
  readonly measurementOptions = measurementOptions;
  readonly measurementUnit = measurementUnit;

  private readonly reportLayoutState = inject(ReportLayoutState);

  controlsHidden(chartId: number): boolean {
    return this.reportLayoutState.controlsHidden(chartId);
  }

  setMetricUnits(metric: boolean): void {
    this.reportFacade.setMetricUnits(metric);
  }

  measurementNote(measurement: SeriesInput['measurement']): string {
    if (measurement === 'weather_code')
      return 'WMO codes identify weather categories. Use daily values or count matching days; sums and averages of codes have no weather meaning.';
    if (measurement === 'wind_direction_10m_dominant')
      return 'Direction is measured clockwise from north. Ordinary sums and averages do not account for the 360°/0° wraparound; use daily values or counts.';
    return '';
  }

  private readonly reportFacade = inject(ReportFacade);
  private readonly dialogs = inject(DialogService);

  readonly report = input.required<ReportInput>();

  readonly autopopulate = model(false);

  readonly editorMessage = output<string>();

  readonly locationSearchRequested = output<SeriesRequest>();

  readonly weatherDataRequested = output<ChartDataRequest>();

  chartHasExpandedForms(chartId: number): boolean {
    const chart = this.report().charts.find((currentChart) => currentChart.chartId === chartId);

    return chart?.seriesInputs.some((series) => series.expanded) ?? false;
  }

  toggleChartForms(chartId: number): void {
    const expanded = !this.chartHasExpandedForms(chartId);

    this.reportFacade.setChartSeriesExpanded(chartId, expanded);
  }

  moveChart(chartId: number, direction: -1 | 1): void {
    this.reportFacade.moveChart(chartId, direction);
  }

  activeHelp: HelpTopic | null = null;
  helpSeries: SeriesInput | null = null;

  setChartName(chartId: number, name: string): void {
    this.reportFacade.setChartName(chartId, name);
  }

  setChartComments(chartId: number, comments: string): void {
    this.reportFacade.setChartComments(chartId, comments);
  }

  pendingChartType(chartId: number): ChartType {
    return (
      this.report().charts.find((chart) => chart.chartId === chartId)?.pendingChartType ?? 'line'
    );
  }

  setBarEnabled(chartId: number, enabled: boolean): void {
    this.reportFacade.setPendingChartType(chartId, enabled ? 'bar' : 'line');
  }

  addChart(afterChartId: number): void {
    const addedChartId = this.reportFacade.addChart(afterChartId);

    if (addedChartId === null) return;

    setTimeout(() => {
      document
        .getElementById(`chart-editor-${addedChartId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async deleteInputChart(chartId: number): Promise<void> {
    const chartIndex = this.report().charts.findIndex((chart) => chart.chartId === chartId);

    if (chartIndex < 0) {
      return;
    }

    const chart = this.report().charts[chartIndex];
    const chartName = chart.name.trim() || `Chart ${chartIndex + 1}`;
    const shouldDelete = await this.dialogs.confirm({
      title: 'Delete chart?',
      message: `Are you sure you want to delete this chart: ${chartName}?`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      confirmDanger: true,
    });

    if (!shouldDelete) {
      return;
    }

    const deleted = this.reportFacade.deleteChart(chartId);

    this.editorMessage.emit(deleted ? '' : 'A story must contain at least one chart');
  }

  addSeries(chartId: number, sourceSeriesId: number): void {
    const addedSeriesId = this.reportFacade.addSeries(
      chartId,
      sourceSeriesId,
      this.autopopulate(),
    );

    if (addedSeriesId === null) {
      return;
    }

    setTimeout(() => {
      document
        .getElementById(`series-editor-${addedSeriesId}`)
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
    });
  }

  setChartWideEdit(chartId: number, enabled: boolean): void {
    this.reportFacade.setChartWideEdit(chartId, enabled);
  }

  setSeriesTitle(chartId: number, seriesId: number, title: string): void {
    this.reportFacade.setSeriesTitle(chartId, seriesId, title);
  }

  setSeriesField<K extends SharedSeriesField>(
    chartId: number,
    seriesId: number,
    field: K,
    value: SeriesInput[K],
  ): void {
    this.reportFacade.setSharedSeriesField(chartId, seriesId, field, value);
  }

  setAggregation(chartId: number, seriesId: number, aggregation: Aggregation | null): void {
    this.reportFacade.setAggregation(chartId, seriesId, aggregation);
  }

  setDateFilterField<K extends DateFilterField>(
    chartId: number,
    seriesId: number,
    field: K,
    value: SeriesInput['dateFilter'][K],
  ): void {
    this.reportFacade.setDateFilterField(chartId, seriesId, field, value);
  }

  deleteSeries(chartId: number, seriesId: number): void {
    const deleted = this.reportFacade.deleteSeries(chartId, seriesId);

    this.editorMessage.emit(deleted ? '' : "Can't delete a chart's last series");
  }

  setGroupBy(chartId: number, groupBy: GroupBy | null): void {
    this.reportFacade.setGroupBy(chartId, groupBy);
  }

  movingAverageSupported(groupBy: GroupBy | null): boolean {
    return groupBy === 'year' || groupBy === 'yearMonth' || groupBy === 'yearMonthDay';
  }

  movingAverageUnit(groupBy: GroupBy | null): string {
    switch (groupBy) {
      case 'year':
        return 'years';
      case 'yearMonth':
        return 'months';
      case 'yearMonthDay':
        return 'days';
      default:
        return 'groups';
    }
  }

  setMovingAverageEnabled(chartId: number, seriesId: number, enabled: boolean): void {
    this.reportFacade.setMovingAverageWindow(chartId, seriesId, enabled ? 3 : null);
  }

  setMovingAverageWindow(chartId: number, seriesId: number, windowSize: number | null): void {
    this.reportFacade.setMovingAverageWindow(chartId, seriesId, windowSize ?? 3);
  }

  setSeriesExpanded(chartId: number, seriesId: number, event: Event): void {
    const details = event.currentTarget as HTMLDetailsElement;

    this.reportFacade.setSeriesExpanded(chartId, seriesId, details.open);
  }

  searchCity(chartId: number, series: SeriesInput): void {
    this.locationSearchRequested.emit({
      chartId,
      series,
    });
  }

  selectLocation(chartId: number, seriesId: number, location: QueryLocation): void {
    this.reportFacade.selectLocation(chartId, seriesId, location);
  }

  getWeatherData(chartId: number): void {
    this.weatherDataRequested.emit({
      chartId,
      chartType: this.pendingChartType(chartId),
    });
  }

  showHelp(topic: HelpTopic, series: SeriesInput): void {
    this.helpSeries = series;

    this.activeHelp = this.activeHelp === topic ? null : topic;
  }

  closeHelp(): void {
    this.activeHelp = null;
    this.helpSeries = null;
  }
}
