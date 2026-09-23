import { TestBed } from '@angular/core/testing';

import { ReportFacade } from '../../application/report-facade';
import { ReportEditorStore } from '../../state/report-editor-store';

import { ReportEditor } from './report-editor';

describe('Editor controls', () => {
  it('uses one pending Bar setting for every series in a chart without applying it immediately', async () => {
    const store = new ReportEditorStore();
    const chart = store.report().charts[0];

    store.addSeries(chart.chartId, chart.seriesInputs[0].seriesId, false);

    const facade = {
      setPendingChartType: (chartId: number, chartType: 'line' | 'bar') =>
        store.updateChart(chartId, (current) => ({
          ...current,
          pendingChartType: chartType,
        })),
    };

    await TestBed.configureTestingModule({
      imports: [ReportEditor],
      providers: [
        {
          provide: ReportFacade,
          useValue: facade,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportEditor);

    fixture.componentRef.setInput('report', store.report());

    fixture.detectChanges();

    const component = fixture.componentInstance;

    component.setBarEnabled(chart.chartId, true);

    fixture.componentRef.setInput('report', store.report());

    fixture.detectChanges();
    await fixture.whenStable();

    const barCheckboxes = Array.from(
      fixture.nativeElement.querySelectorAll('.bar-control input'),
    ) as HTMLInputElement[];

    expect(barCheckboxes).toHaveLength(2);

    expect(barCheckboxes.every((checkbox) => checkbox.checked)).toBe(true);

    // Changing the pending setting should not change
    // the displayed chart type until Get Data succeeds.
    expect(store.report().charts[0].chartType).toBe('line');

    fixture.destroy();
  });

  it('changes the form-toggle label and affects only the selected chart', async () => {
    const store = new ReportEditorStore();

    const firstChartId = store.report().charts[0].chartId;

    const firstSeriesId = store.report().charts[0].seriesInputs[0].seriesId;

    // Give the first chart two forms so that we can also
    // test a mixture of expanded and collapsed forms.
    store.addSeries(firstChartId, firstSeriesId, false);

    // Add a second chart after the first chart.
    store.addChart(firstChartId);

    const secondChartId = store.report().charts[1].chartId;

    const facade = {
      setChartSeriesExpanded: (chartId: number, expanded: boolean) =>
        store.setChartSeriesExpanded(chartId, expanded),

      setSeriesExpanded: (chartId: number, seriesId: number, expanded: boolean) =>
        store.updateSeries(chartId, seriesId, (series) => ({
          ...series,
          expanded,
        })),
    };

    await TestBed.configureTestingModule({
      imports: [ReportEditor],
      providers: [
        {
          provide: ReportFacade,
          useValue: facade,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportEditor);

    const refreshReport = (): void => {
      fixture.componentRef.setInput('report', store.report());

      fixture.detectChanges();
    };

    refreshReport();

    const formToggleButtons = (): HTMLButtonElement[] =>
      Array.from(
        fixture.nativeElement.querySelectorAll('.chart-forms-toggle'),
      ) as HTMLButtonElement[];

    expect(formToggleButtons()).toHaveLength(2);

    expect(formToggleButtons()[0].textContent).toContain('Collapse Forms');

    expect(formToggleButtons()[1].textContent).toContain('Collapse Forms');

    // Collapse only the first chart.
    formToggleButtons()[0].click();

    refreshReport();

    expect(formToggleButtons()[0].textContent).toContain('Expand Forms');

    // The second chart's button should be unchanged.
    expect(formToggleButtons()[1].textContent).toContain('Collapse Forms');

    const collapsedFirstChart = store
      .report()
      .charts.find((chart) => chart.chartId === firstChartId)!;

    const unchangedSecondChart = store
      .report()
      .charts.find((chart) => chart.chartId === secondChartId)!;

    expect(collapsedFirstChart.seriesInputs.every((series) => !series.expanded)).toBe(true);

    expect(unchangedSecondChart.seriesInputs.every((series) => series.expanded)).toBe(true);

    // Expand only one form in the first chart. Because
    // that chart now has at least one expanded form, its
    // button should return to "Collapse Forms."
    store.updateSeries(firstChartId, collapsedFirstChart.seriesInputs[0].seriesId, (series) => ({
      ...series,
      expanded: true,
    }));

    refreshReport();

    expect(formToggleButtons()[0].textContent).toContain('Collapse Forms');

    fixture.destroy();
  });

  it('adds a chart immediately after the chart whose button was clicked', async () => {
    const store = new ReportEditorStore();

    const firstChartId = store.report().charts[0].chartId;

    // Add an existing second chart. This lets the test
    // distinguish insertion from simple appending.
    store.addChart(firstChartId);

    const originalSecondChartId = store.report().charts[1].chartId;

    const facade = {
      addChart: (afterChartId: number) => store.addChart(afterChartId),
    };

    await TestBed.configureTestingModule({
      imports: [ReportEditor],
      providers: [
        {
          provide: ReportFacade,
          useValue: facade,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportEditor);

    const refreshReport = (): void => {
      fixture.componentRef.setInput('report', store.report());

      fixture.detectChanges();
    };

    refreshReport();

    const addChartButtons = (): HTMLButtonElement[] =>
      Array.from(
        fixture.nativeElement.querySelectorAll('.add-chart-button'),
      ) as HTMLButtonElement[];

    expect(addChartButtons()).toHaveLength(2);

    // Click Add Chart in the first chart's control bar.
    addChartButtons()[0].click();

    refreshReport();

    const charts = store.report().charts;

    expect(charts).toHaveLength(3);

    // The original first chart remains first.
    expect(charts[0].chartId).toBe(firstChartId);

    // The original second chart moves to position three,
    // proving the new chart was inserted rather than appended.
    expect(charts[2].chartId).toBe(originalSecondChartId);

    const insertedChart = charts[1];

    expect(insertedChart.chartId).not.toBe(firstChartId);

    expect(insertedChart.chartId).not.toBe(originalSecondChartId);

    fixture.destroy();
  });

  it('shows a default window input after Moving average is enabled', async () => {
    const store = new ReportEditorStore();
    const chart = store.report().charts[0];

    store.updateChart(chart.chartId, (current) => ({
      ...current,
      groupBy: 'year',
    }));

    const facade = {
      setMovingAverageWindow: (
        chartId: number,
        seriesId: number,
        movingAverageWindow: number | null,
      ) =>
        store.updateSeries(chartId, seriesId, (current) => ({
          ...current,
          movingAverageWindow,
        })),
    };

    await TestBed.configureTestingModule({
      imports: [ReportEditor],
      providers: [{ provide: ReportFacade, useValue: facade }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportEditor);
    const refreshReport = (): void => {
      fixture.componentRef.setInput('report', store.report());
      fixture.detectChanges();
    };

    refreshReport();

    const checkbox = fixture.nativeElement.querySelector(
      '.moving-average-toggle input',
    ) as HTMLInputElement;

    expect(checkbox.checked).toBe(false);
    expect(fixture.nativeElement.querySelector('.moving-average-window-field')).toBeNull();

    checkbox.click();
    refreshReport();
    await fixture.whenStable();

    const windowInput = fixture.nativeElement.querySelector(
      '.moving-average-window-field input',
    ) as HTMLInputElement;

    expect(store.report().charts[0].seriesInputs[0].movingAverageWindow).toBe(3);
    expect(windowInput).not.toBeNull();
    expect(windowInput.valueAsNumber).toBe(3);

    fixture.destroy();
  });

  it('shows the Number of days guidance and limits the start-date picker to 1940', async () => {
    const store = new ReportEditorStore();
    const chart = store.report().charts[0];
    store.updateSeries(chart.chartId, chart.seriesInputs[0].seriesId, (series) => ({
      ...series,
      aggregation: 'count',
    }));

    await TestBed.configureTestingModule({
      imports: [ReportEditor],
      providers: [{ provide: ReportFacade, useValue: {} }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportEditor);
    fixture.componentRef.setInput('report', store.report());
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Number of days should be used with a value filter',
    );
    expect(
      (fixture.nativeElement.querySelector('input[type="date"]') as HTMLInputElement).min,
    ).toBe('1940-01-01');

    fixture.destroy();
  });
});
