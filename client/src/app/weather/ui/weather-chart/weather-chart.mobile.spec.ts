import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Chart } from 'chart.js';
import { WeatherChart } from './weather-chart';

vi.mock('chart.js', () => {
  class FakeChart {
    static register() {}
    static last: FakeChart;
    static defaults = {
      plugins: {
        legend: {
          labels: {
            generateLabels: (chart: FakeChart) =>
              chart.data.datasets.map((dataset: any, index: number) => ({
                datasetIndex: index,
                text: dataset.label,
                strokeStyle: '#123456',
              })),
          },
        },
      },
    };
    data: any;
    options: any;
    hidden = new Set<number>();
    constructor(_canvas: unknown, config: any) {
      this.data = config.data;
      this.options = config.options;
      FakeChart.last = this;
    }
    destroy() {}
    update() {}
    isDatasetVisible(index: number) {
      return !this.hidden.has(index);
    }
    setDatasetVisibility(index: number, visible: boolean) {
      if (visible) this.hidden.delete(index);
      else this.hidden.add(index);
    }
  }
  return { Chart: FakeChart, registerables: [] };
});

describe('Mobile chart layout', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps many legend entries outside the canvas and lets users toggle a series', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }));
    await TestBed.configureTestingModule({ imports: [WeatherChart] }).compileComponents();
    const fixture = TestBed.createComponent(WeatherChart);
    fixture.componentRef.setInput(
      'graphSeries',
      Array.from({ length: 20 }, (_, index) => ({
        seriesId: index,
        label: `Series ${index}`,
        yAxisId: 'temperature',
        yAxisLabel: 'Temperature',
        points: [{ date: '2020', value: index }],
      })),
    );
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const chart = (Chart as any).last;
    expect(chart.options.maintainAspectRatio).toBe(false);
    expect(chart.options.plugins.legend.display).toBe(false);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.chart-legend button').length).toBe(20);
    expect(element.querySelector('.chart-container .chart-legend')).toBeNull();
    const first = element.querySelector('.chart-legend button') as HTMLButtonElement;
    first.click();
    fixture.detectChanges();
    expect(chart.isDatasetVisible(0)).toBe(false);
    expect(first.getAttribute('aria-pressed')).toBe('false');
    first.click();
    fixture.detectChanges();
    expect(chart.isDatasetVisible(0)).toBe(true);
    fixture.destroy();
  });
});
