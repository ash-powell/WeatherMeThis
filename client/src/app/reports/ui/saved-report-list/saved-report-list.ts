import { DatePipe } from '@angular/common';
import { Component, computed, HostListener, input, output, signal } from '@angular/core';

import type { SavedReport } from '../../models/report.models';

@Component({
  selector: 'app-saved-report-list',
  imports: [DatePipe],
  templateUrl: './saved-report-list.html',
  styleUrl: './saved-report-list.scss',
})
export class SavedReportList {
  readonly reports = input.required<SavedReport[]>();
  readonly loading = input(false);

  readonly closed = output<void>();
  readonly reportSelected = output<SavedReport>();

  readonly searchText = signal('');
  readonly sortOrder = signal<SavedReportSort>('dateNewest');

  readonly displayedReports = computed(() => {
    const searchText = this.searchText().trim().toLocaleLowerCase();
    const matches = this.reports().filter((report) =>
      report.name.toLocaleLowerCase().includes(searchText),
    );

    return [...matches].sort((first, second) => {
      switch (this.sortOrder()) {
        case 'nameAscending':
          return first.name.localeCompare(second.name, undefined, { sensitivity: 'base' });

        case 'nameDescending':
          return second.name.localeCompare(first.name, undefined, { sensitivity: 'base' });

        case 'dateOldest':
          return Date.parse(first.createdAt) - Date.parse(second.createdAt);

        case 'dateNewest':
        default:
          return Date.parse(second.createdAt) - Date.parse(first.createdAt);
      }
    });
  });

  updateSearch(event: Event): void {
    const searchInput = event.target as HTMLInputElement;
    this.searchText.set(searchInput.value);
  }

  updateSort(event: Event): void {
    const sortSelect = event.target as HTMLSelectElement;
    this.sortOrder.set(sortSelect.value as SavedReportSort);
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.closed.emit();
  }
}

type SavedReportSort = 'nameAscending' | 'nameDescending' | 'dateNewest' | 'dateOldest';
