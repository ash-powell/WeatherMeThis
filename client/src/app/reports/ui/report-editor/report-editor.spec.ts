import { TestBed } from '@angular/core/testing';
import { ReportEditor } from './report-editor';
import { ReportEditorStore } from '../../state/report-editor-store';
import { ReportFacade } from '../../application/report-facade';

describe('Editor controls', () => {
  it('uses one pending Bar setting for every series in a chart without applying it immediately', async () => {
    const store = new ReportEditorStore();
    const chart = store.report().charts[0];
    store.addSeries(chart.chartId, chart.seriesInputs[0].seriesId, false);
    const facade = {
      setAllSeriesExpanded: (expanded: boolean) => store.setAllSeriesExpanded(expanded),
      setSeriesExpanded: (chartId: number, seriesId: number, expanded: boolean) =>
        store.updateSeries(chartId, seriesId, (series) => ({ ...series, expanded })),
      setPendingChartType: (chartId: number, chartType: 'line' | 'bar') =>
        store.updateChart(chartId, (current) => ({ ...current, pendingChartType: chartType })),
    };
    await TestBed.configureTestingModule({
      imports: [ReportEditor],
      providers: [{ provide: ReportFacade, useValue: facade }],
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
    expect(store.report().charts[0].chartType).toBe('line');
    fixture.destroy();
  });

  it('changes the collapse button label for mixed expansion and toggles every chart', async () => {
    const store = new ReportEditorStore();
    store.addChart();
    const facade = {
      setAllSeriesExpanded: (expanded: boolean) => store.setAllSeriesExpanded(expanded),
      setSeriesExpanded: (chartId: number, seriesId: number, expanded: boolean) =>
        store.updateSeries(chartId, seriesId, (series) => ({ ...series, expanded })),
    };
    await TestBed.configureTestingModule({
      imports: [ReportEditor],
      providers: [{ provide: ReportFacade, useValue: facade }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ReportEditor);
    fixture.componentRef.setInput('report', store.report());
    fixture.detectChanges();
    const button = () =>
      fixture.nativeElement.querySelector('.editor-actions button:last-child') as HTMLButtonElement;
    expect(button().textContent).toContain('Collapse All Forms');
    button().click();
    fixture.componentRef.setInput('report', store.report());
    fixture.detectChanges();
    expect(button().textContent).toContain('Expand Forms');
    expect(store.report().charts.every((c) => c.seriesInputs.every((s) => !s.expanded))).toBe(true);
    const chart = store.report().charts[1];
    store.updateSeries(chart.chartId, chart.seriesInputs[0].seriesId, (series) => ({
      ...series,
      expanded: true,
    }));
    fixture.componentRef.setInput('report', store.report());
    fixture.detectChanges();
    expect(button().textContent).toContain('Collapse All Forms');
    fixture.destroy();
  });
});
