import { Injectable, signal } from '@angular/core';

export interface DialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDanger?: boolean;
}

export interface DialogState {
  title: string;
  message: string;
  confirmLabel: string | null;
  cancelLabel: string | null;
  confirmDanger: boolean;
  autoCloseMs: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private readonly state = signal<DialogState | null>(null);
  private resolveConfirmation: ((confirmed: boolean) => void) | null = null;
  private autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

  readonly dialog = this.state.asReadonly();

  show(message: string, title = 'Notice'): void {
    this.open({
      title,
      message,
      confirmLabel: 'Close',
      cancelLabel: null,
      confirmDanger: false,
      autoCloseMs: null,
    });
  }

  showLoading(message: string, title = 'Notice'): void {
    this.open({
      title,
      message,
      confirmLabel: null,
      cancelLabel: null,
      confirmDanger: false,
      autoCloseMs: null,
    });
  }

  showTemporary(message: string, title = 'Notice', autoCloseMs = 1000): void {
    const dialog: DialogState = {
      title,
      message,
      confirmLabel: null,
      cancelLabel: null,
      confirmDanger: false,
      autoCloseMs,
    };

    this.open(dialog);

    this.autoCloseTimer = setTimeout(() => {
      if (this.state() === dialog) {
        this.state.set(null);
      }

      this.autoCloseTimer = null;
    }, autoCloseMs);
  }

  confirm(options: DialogOptions): Promise<boolean> {
    this.open({
      ...options,
      confirmLabel: options.confirmLabel ?? 'Continue',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      confirmDanger: options.confirmDanger ?? false,
      autoCloseMs: null,
    });

    return new Promise((resolve) => {
      this.resolveConfirmation = resolve;
    });
  }

  respond(confirmed: boolean): void {
    this.clearAutoClose();
    this.state.set(null);
    this.finishPendingConfirmation(confirmed);
  }

  close(): void {
    this.respond(false);
  }

  private open(dialog: DialogState): void {
    this.clearAutoClose();
    this.finishPendingConfirmation(false);
    this.state.set(dialog);
  }

  private clearAutoClose(): void {
    if (this.autoCloseTimer !== null) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }
  }

  private finishPendingConfirmation(confirmed: boolean): void {
    const resolve = this.resolveConfirmation;
    this.resolveConfirmation = null;
    resolve?.(confirmed);
  }
}
