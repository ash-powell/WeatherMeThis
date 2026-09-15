import {
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';
import type { GraphSeries } from '../../models/graph.models';
import type { ChartType } from '../../models/chart.models';

Chart.register(...registerables);

@Component({
  selector: 'app-weather-chart',
  imports: [],
  templateUrl: './weather-chart.html',
  styleUrl: './weather-chart.scss',
})
export class WeatherChart {
  graphSeries = input<GraphSeries[]>([]);
  chartType = input<ChartType>('line');

  canvas = viewChild<ElementRef<HTMLCanvasElement>>('weatherChart');

  readonly mobileLayout = signal(false);
  readonly legendEntries = signal<
    Array<{
      datasetIndex: number;
      text: string;
      color: string;
      hidden: boolean;
    }>
  >([]);

  private chart: Chart | null = null;

  toggleSeries(datasetIndex: number): void {
    if (!this.chart) return;
    this.chart.setDatasetVisibility(datasetIndex, !this.chart.isDatasetVisible(datasetIndex));
    this.chart.update();
    this.refreshLegend();
  }

  private refreshLegend(): void {
    const chart = this.chart;
    if (!chart) return;
    this.legendEntries.set(
      Chart.defaults.plugins.legend.labels.generateLabels(chart).map((item) => ({
        datasetIndex: item.datasetIndex!,
        text: item.text,
        color: typeof item.strokeStyle === 'string' ? item.strokeStyle : '#64748b',
        hidden: !chart.isDatasetVisible(item.datasetIndex!),
      })),
    );
  }

  constructor() {
    const mobile = window.matchMedia?.('(max-width: 42rem), (hover: none) and (pointer: coarse)');
    this.mobileLayout.set(mobile?.matches ?? false);
    const updateLegend = () => this.mobileLayout.set(mobile?.matches ?? false);
    mobile?.addEventListener('change', updateLegend);
    inject(DestroyRef).onDestroy(() => mobile?.removeEventListener('change', updateLegend));

    effect((onCleanup) => {
      const compact = this.mobileLayout();
      this.legendEntries.set([]);
      const canvas = this.canvas();
      const series = this.graphSeries();
      const chartType = this.chartType();

      if (!canvas || series.length === 0) {
        return;
      }

      const labels = [
        ...new Set(series.flatMap((series) => series.points.map((point) => point.date))),
      ].sort();

      const scales: any = {};

      series.forEach((graph, index) => {
        if (!scales[graph.yAxisId]) {
          scales[graph.yAxisId] = {
            type: 'linear',
            position: index % 2 === 0 ? 'left' : 'right',
            title: {
              display: true,
              text: graph.yAxisLabel,
            },
          };
        }
      });

      this.chart?.destroy();

      this.chart = new Chart(canvas.nativeElement, {
        type: chartType,

        data: {
          labels,

          datasets: series.map((series) => {
            const valuesByDate = new Map(series.points.map((point) => [point.date, point.value]));

            return {
              label: series.label,
              yAxisID: series.yAxisId,
              data: labels.map((date) => valuesByDate.get(date) ?? null),
            };
          }),
        },

        options: {
          responsive: true,
          maintainAspectRatio: !compact,
          plugins: {
            legend: {
              display: !compact,
              labels: { boxWidth: 12, boxHeight: 12 },
            },
          },
          scales,
        },
      });
      this.refreshLegend();
      onCleanup(() => {
        this.chart?.destroy();
        this.chart = null;
      });
    });
  }
}
