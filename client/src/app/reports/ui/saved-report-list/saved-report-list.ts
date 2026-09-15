import { Component, input, output } from '@angular/core';

import { RouterLink } from '@angular/router';

import type { SavedReport } from '../../models/report.models';

@Component({
  selector: 'app-saved-report-list',
  imports: [RouterLink],
  templateUrl: './saved-report-list.html',
  styleUrl: './saved-report-list.scss',
})
export class SavedReportList {
  readonly closed = output<void>();

  readonly reports = input.required<SavedReport[]>();

  readonly reportSelected = output<SavedReport>();

  readonly publishRequested = output<SavedReport>();

  readonly unpublishRequested = output<SavedReport>();
}
