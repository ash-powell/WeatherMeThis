import { Component, signal, input } from '@angular/core';

import { WeatherChart } from '../../../weather/ui/weather-chart/weather-chart';

import type { ChartInput } from '../../models/report-editor.models';

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
