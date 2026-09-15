import { Injectable } from '@angular/core';

import type { ReportInput } from '../models/report-editor.models';

export interface StoredReportDraft {
  report: ReportInput;
  reportId: string | null;
  loadedStoryName: string | null;
  autopopulate: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ReportDraftStorage {
  private readonly storageKey = 'weatherMeThis.reportDraft';

  save(
    report: ReportInput,
    reportId: string | null,
    loadedStoryName: string | null,
    autopopulate: boolean,
  ): void {
    const draft: StoredReportDraft = {
      report: {
        ...report,

        charts: report.charts.map((chart) => ({
          ...chart,

          seriesInputs: chart.seriesInputs.map((series) => ({
            ...series,

            dateFilter: {
              ...series.dateFilter,
            },

            locations: [],
          })),

          graphSeries: chart.graphSeries.map((series) => ({
            ...series,

            points: series.points.map((point) => ({
              ...point,
            })),
          })),
        })),
      },

      reportId,
      loadedStoryName,
      autopopulate,
    };

    const serializedDraft = JSON.stringify(draft);

    sessionStorage.setItem(this.storageKey, serializedDraft);

    const storedDraft = sessionStorage.getItem(this.storageKey);

    if (storedDraft !== serializedDraft) {
      throw new Error('Stored report draft did not match');
    }
  }

  load(): StoredReportDraft | null {
    const storedDraft = sessionStorage.getItem(this.storageKey);

    if (!storedDraft) {
      return null;
    }

    const parsed: unknown = JSON.parse(storedDraft);

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Invalid stored report draft');
    }

    const draft = parsed as Partial<StoredReportDraft>;

    if (!draft.report || !Array.isArray(draft.report.charts)) {
      throw new Error('Invalid stored report draft');
    }

    return {
      report: draft.report,

      reportId: typeof draft.reportId === 'string' ? draft.reportId : null,

      loadedStoryName: typeof draft.loadedStoryName === 'string' ? draft.loadedStoryName : null,

      autopopulate: draft.autopopulate === true,
    };
  }

  clear(): void {
    try {
      sessionStorage.removeItem(this.storageKey);
    } catch {
      // Browser storage is unavailable.
    }
  }
}
