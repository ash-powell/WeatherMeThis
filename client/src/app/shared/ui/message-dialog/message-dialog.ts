import { Component, HostListener, inject } from '@angular/core';

import { DialogService } from '../../application/dialog.service';

@Component({
  selector: 'app-message-dialog',
  imports: [],
  templateUrl: './message-dialog.html',
  styleUrl: './message-dialog.scss',
})
export class MessageDialog {
  protected readonly dialogs = inject(DialogService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    const dialog = this.dialogs.dialog();
    if (!dialog) {
      return;
    }

    if (!dialog.confirmLabel && !dialog.cancelLabel) {
      return;
    }

    this.dialogs.respond(dialog.cancelLabel !== null ? false : true);
  }
}
