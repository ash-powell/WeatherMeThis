import { Component, input, output } from '@angular/core';

import type { HelpTopic, SeriesInput } from '../../models/report-editor.models';

@Component({
  selector: 'app-report-help-dialog',
  imports: [],
  templateUrl: './report-help-dialog.html',
  styleUrl: './report-help-dialog.scss',
})
export class ReportHelpDialog {
  readonly topic = input<HelpTopic | null>(null);

  readonly series = input<SeriesInput | null>(null);

  readonly closed = output<void>();
}
