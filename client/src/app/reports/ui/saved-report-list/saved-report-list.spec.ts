import { TestBed } from '@angular/core/testing';

import type { SavedReport } from '../../models/report.models';
import { SavedReportList } from './saved-report-list';

describe('SavedReportList', () => {
  it('sorts saved stories by newest date initially', async () => {
    const fixture = await createFixture([
      createReport('older', 'Older Story', '2025-01-01T12:00:00.000Z'),
      createReport('newer', 'Newer Story', '2026-01-01T12:00:00.000Z'),
    ]);

    expect(storyNames(fixture.nativeElement)).toEqual(['Newer Story', 'Older Story']);
  });

  it('searches story names without regard to letter case', async () => {
    const fixture = await createFixture([
      createReport('rain', 'Raleigh Rainfall', '2026-01-01T12:00:00.000Z'),
      createReport('heat', 'Miami Heat', '2026-02-01T12:00:00.000Z'),
    ]);
    const search = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;

    search.value = 'RALEIGH';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(storyNames(fixture.nativeElement)).toEqual(['Raleigh Rainfall']);
  });

  it('sorts story names from A to Z when selected', async () => {
    const fixture = await createFixture([
      createReport('zulu', 'Zulu', '2026-01-01T12:00:00.000Z'),
      createReport('alpha', 'Alpha', '2025-01-01T12:00:00.000Z'),
    ]);
    const sort = fixture.nativeElement.querySelector('select') as HTMLSelectElement;

    sort.value = 'nameAscending';
    sort.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(storyNames(fixture.nativeElement)).toEqual(['Alpha', 'Zulu']);
  });

  it('shows only story-selection controls', async () => {
    const fixture = await createFixture([
      createReport('public', 'Public Story', '2026-01-01T12:00:00.000Z', true),
    ]);
    const text = fixture.nativeElement.textContent as string;

    expect(text).not.toContain('Publish');
    expect(text).not.toContain('Unpublish');
    expect(text).not.toContain('View public story');
  });
});

async function createFixture(reports: SavedReport[]) {
  await TestBed.configureTestingModule({
    imports: [SavedReportList],
  }).compileComponents();

  const fixture = TestBed.createComponent(SavedReportList);
  fixture.componentRef.setInput('reports', reports);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

function storyNames(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('.saved-report-name')).map(
    (element) => element.textContent?.trim() ?? '',
  );
}

function createReport(id: string, name: string, createdAt: string, isPublic = false): SavedReport {
  return {
    _id: id,
    name,
    createdAt,
    isPublic,
    publishedAt: isPublic ? createdAt : null,
    likeCount: 0,
    charts: [],
  };
}
