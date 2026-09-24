import { Component, inject, input, output, signal } from '@angular/core';

import { WeatherChart } from '../../../weather/ui/weather-chart/weather-chart';

import type { ChartInput } from '../../models/report-editor.models';
import { ReportLayoutState } from '../../state/report-layout-state';

export interface ChartMoveRequest {
  chartId: number;
  direction: -1 | 1;
}

@Component({
  selector: 'app-report-charts',
  imports: [WeatherChart],
  templateUrl: './report-charts.html',
  styleUrl: './report-charts.scss',
})
export class ReportCharts {
  readonly collapsedCharts = signal<Set<ChartInput>>(new Set());

  private readonly reportLayoutState = inject(ReportLayoutState);
  readonly showControlsToggle = input(false);
  readonly showOrderControls = input(false);
  readonly canMoveUp = input(false);
  readonly canMoveDown = input(false);
  readonly chartMoveRequested = output<ChartMoveRequest>();

  controlsHidden(chartId: number): boolean {
    return this.reportLayoutState.controlsHidden(chartId);
  }

  toggleControls(chartId: number): void {
    this.reportLayoutState.toggleControls(chartId);
  }

  requestChartMove(chartId: number, direction: -1 | 1): void {
    this.chartMoveRequested.emit({ chartId, direction });
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
