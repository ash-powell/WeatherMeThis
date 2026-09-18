import { TestBed } from '@angular/core/testing';
import { ReportCharts } from './report-charts';
import { ReportEditorStore } from '../../state/report-editor-store';

describe('Gallery chart comments', () => {
  it('starts reduced, toggles, and reduces comments on a newly loaded chart', async () => {
    await TestBed.configureTestingModule({ imports: [ReportCharts] }).compileComponents();
    const fixture = TestBed.createComponent(ReportCharts);
    const chart = {
      ...new ReportEditorStore().report().charts[0],
      comments: 'First line\nSecond line\nThird line',
    };
    fixture.componentRef.setInput('charts', [chart]);
    fixture.componentRef.setInput('collapsibleComments', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.comments-reduced')).toBeTruthy();
    fixture.nativeElement.querySelector('.comments-toggle').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.comments-expanded')).toBeTruthy();
    fixture.nativeElement.querySelector('.comments-toggle').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.comments-reduced')).toBeTruthy();
    fixture.componentInstance.toggleComments(chart);
    fixture.componentRef.setInput('charts', [{ ...chart, comments: 'Another story' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.comments-reduced')).toBeTruthy();
    fixture.destroy();
  });

  it('keeps the chart title and toggle visible while the chart is collapsed', async () => {
    await TestBed.configureTestingModule({ imports: [ReportCharts] }).compileComponents();
    const fixture = TestBed.createComponent(ReportCharts);
    const chart = {
      ...new ReportEditorStore().report().charts[0],
      name: 'Raleigh temperatures',
      comments: 'Chart comments',
    };
    fixture.componentRef.setInput('charts', [chart]);
    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector('h2') as HTMLHeadingElement;
    const toggle = fixture.nativeElement.querySelector(
      '.chart-collapse-toggle',
    ) as HTMLButtonElement;
    const content = fixture.nativeElement.querySelector('.report-chart-content') as HTMLElement;

    expect(title.textContent).toContain('Raleigh temperatures');
    expect(toggle.textContent).toContain('Hide Chart');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(content.hidden).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('.chart-separator')).toHaveLength(1);

    toggle.click();
    fixture.detectChanges();

    expect(title.textContent).toContain('Raleigh temperatures');
    expect(toggle.textContent).toContain('Show Chart');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(content.hidden).toBe(true);

    toggle.click();
    fixture.detectChanges();

    expect(toggle.textContent).toContain('Hide Chart');
    expect(content.hidden).toBe(false);
    fixture.destroy();
  });
});
