import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ReportLayoutState {
  private readonly hiddenControlsState = signal<ReadonlySet<number>>(
    new Set<number>(),
  );

  readonly hiddenControls = this.hiddenControlsState.asReadonly();

  controlsHidden(chartId: number): boolean {
    return this.hiddenControlsState().has(chartId);
  }

  toggleControls(chartId: number): void {
    this.hiddenControlsState.update((current) => {
      const next = new Set(current);

      if (next.has(chartId)) {
        next.delete(chartId);
      } else {
        next.add(chartId);
      }

      return next;
    });
  }
}