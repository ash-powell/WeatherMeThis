import { TestBed } from '@angular/core/testing';
import { ReportCharts } from './report-charts';
import { ReportEditorStore } from '../../state/report-editor-store';

describe('Gallery chart comments', () => {
  it('shows comments in a resizable scrolling region without a separate toggle', async () => {
    await TestBed.configureTestingModule({ imports: [ReportCharts] }).compileComponents();
    const fixture = TestBed.createComponent(ReportCharts);
    const chart = {
      ...new ReportEditorStore().report().charts[0],
      comments: 'First line\nSecond line\nThird line',
    };
    fixture.componentRef.setInput('charts', [chart]);
    fixture.detectChanges();

    const comments = fixture.nativeElement.querySelector('.chart-comments') as HTMLElement;
    expect(comments.textContent).toContain('First line');
    expect(comments.getAttribute('title')).toContain('resize comments');
    expect(comments.getAttribute('tabindex')).toBe('0');
    expect(fixture.nativeElement.querySelector('.comments-toggle')).toBeNull();
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
