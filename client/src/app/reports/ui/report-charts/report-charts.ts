import { Component, inject, signal, input } from '@angular/core';

import { WeatherChart } from '../../../weather/ui/weather-chart/weather-chart';

import type { ChartInput } from '../../models/report-editor.models';
import { ReportLayoutState } from '../../state/report-layout-state';

@Component({
  selector: 'app-report-charts',
  imports: [WeatherChart],
  templateUrl: './report-charts.html',
  styleUrl: './report-charts.scss',
})
export class ReportCharts {
  readonly collapsibleComments = input(true);
  readonly expandedComments = signal<Set<ChartInput>>(new Set());
  readonly collapsedCharts = signal<Set<ChartInput>>(new Set());

  private readonly reportLayoutState = inject(ReportLayoutState);
  readonly showControlsToggle = input(false);

  controlsHidden(chartId: number): boolean{
    return this.reportLayoutState.controlsHidden(chartId);
  }

  toggleControls(chartId: number): void{
    this.reportLayoutState.toggleControls(chartId);
  }

  toggleComments(chart: ChartInput): void {
    this.expandedComments.update((current) => {
      const next = new Set(current);
      if (next.has(chart)) next.delete(chart);
      else next.add(chart);
      return next;
    });
  }

  toggleChart(chart: ChartInput): void {
    this.collapsedCharts.update((current) => {
      const next = new Set(current);
      if (next.has(chart)) next.delete(chart);
      else next.add(chart);
      return next;
    });
  }

  readonly charts = input.required<ChartInput[]>();
}
