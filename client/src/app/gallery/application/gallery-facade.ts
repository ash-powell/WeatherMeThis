import { inject, Injectable, signal } from '@angular/core';

import { map, of, tap } from 'rxjs';

import type { Observable } from 'rxjs';

import { GalleryApi } from '../data-access/gallery-api';

import type {
  GalleryReportSummary,
  GallerySearchQuery,
  GallerySearchResponse,
  PublicGalleryReport,
  PublicReportView,
  PublicationResponse,
} from '../models/gallery.models';

import type { ChartInput } from '../../reports/models/report-editor.models';

@Injectable({
  providedIn: 'root',
})
export class GalleryFacade {
  private readonly galleryApi = inject(GalleryApi);

  private readonly searchResponseState = signal<GallerySearchResponse | null>(null);

  private readonly currentReportState = signal<PublicGalleryReport | null>(null);

  readonly searchResponse = this.searchResponseState.asReadonly();

  readonly currentReport = this.currentReportState.asReadonly();

  search(query: GallerySearchQuery): Observable<GallerySearchResponse> {
    return this.galleryApi.search(query).pipe(
      tap((response) => {
        this.searchResponseState.set(response);
      }),
    );
  }

  loadLikedStatuses(reportIds: string[]): Observable<string[]> {
    if (reportIds.length === 0) {
      return of([]);
    }

    return this.galleryApi.getLikedReportIds(reportIds).pipe(
      map((response) => response.reportIds),
      tap((likedReportIds) => {
        const liked = new Set(likedReportIds);

        this.searchResponseState.update((current) =>
          current
            ? {
                ...current,
                reports: current.reports.map((report) => ({
                  ...report,
                  likedByCurrentUser: liked.has(report._id),
                })),
              }
            : current,
        );

        this.currentReportState.update((current) =>
          current
            ? {
                ...current,
                likedByCurrentUser: liked.has(current._id),
              }
            : current,
        );
      }),
    );
  }

  loadReport(reportId: string): Observable<PublicReportView> {
    return this.galleryApi.getById(reportId).pipe(
      tap((report) => {
        this.currentReportState.set(report);
      }),
      map((report) => ({
        report,
        charts: this.buildCharts(report),
      })),
    );
  }

  publish(reportId: string): Observable<PublicationResponse> {
    return this.galleryApi.publish(reportId);
  }

  unpublish(reportId: string): Observable<void> {
    return this.galleryApi.unpublish(reportId);
  }

  setLiked(reportId: string, liked: boolean): Observable<unknown> {
    const request: Observable<unknown> = liked
      ? this.galleryApi.like(reportId)
      : this.galleryApi.unlike(reportId);

    return request.pipe(
      tap(() => {
        this.updateLikeState(reportId, liked);
      }),
    );
  }

  private updateLikeState(reportId: string, liked: boolean): void {
    const update = <T extends GalleryReportSummary | PublicGalleryReport>(report: T): T => ({
      ...report,
      likedByCurrentUser: liked,
      likeCount: Math.max(0, report.likeCount + (liked ? 1 : -1)),
    });

    this.searchResponseState.update((current) =>
      current
        ? {
            ...current,
            reports: current.reports.map((report) =>
              report._id === reportId ? update(report) : report,
            ),
          }
        : current,
    );

    this.currentReportState.update((current) =>
      current?._id === reportId ? update(current) : current,
    );
  }

  private buildCharts(report: PublicGalleryReport): ChartInput[] {
    return report.charts.map((chart, chartIndex) => ({
      chartId: chartIndex + 1,
      name: chart.name ?? '',
      comments: chart.comments,
      chartType: chart.chartType ?? 'line',
      pendingChartType: chart.chartType ?? 'line',
      metricUnits: chart.metricUnits === true,
      groupBy: chart.groupBy,
      chartWideEdit: false,
      seriesInputs: [],
      graphSeries: (chart.renderedSeries ?? []).flatMap((result, seriesIndex) => {
        if (!result) {
          return [];
        }

        return [
          {
            seriesId: seriesIndex + 1,
            label: result.label,
            yAxisId: result.yAxisId,
            yAxisLabel: result.yAxisLabel,
            requestKey: result.requestKey,
            points: result.dates.map((date, pointIndex) => ({
              date,
              value: result.values[pointIndex] ?? null,
            })),
          },
        ];
      }),
    }));
  }
}
