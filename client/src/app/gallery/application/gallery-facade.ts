import { inject, Injectable, signal } from '@angular/core';

import { forkJoin, map, of, switchMap, tap } from 'rxjs';

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

import { WeatherApi } from '../../weather/data-access/weather-api';

import { buildGraphSeries } from '../../weather/domain/graph-series.builder';

import type { AnalysisRequest } from '../../weather/models/analysis.models';

import type { ChartInput } from '../../reports/models/report-editor.models';

@Injectable({
  providedIn: 'root',
})
export class GalleryFacade {
  private readonly galleryApi = inject(GalleryApi);
  private readonly weatherApi = inject(WeatherApi);

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
      switchMap((report) =>
        this.buildCharts(report).pipe(
          map((charts) => ({
            report,
            charts,
          })),
        ),
      ),
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

  private buildCharts(report: PublicGalleryReport): Observable<ChartInput[]> {
    let nextSeriesId = 1;

    const chartRequests = report.charts.map((chart, chartIndex) => {
      const legacyWindow = (
        chart as typeof chart & { movingAverageWindow?: number | null }
      ).movingAverageWindow;
      const seriesRequests = chart.seriesArray.map((series) => {
        const seriesId = nextSeriesId++;

        const analysis: AnalysisRequest = {
          metricUnits: chart.metricUnits === true,
          location: {
            ...series.location,
          },
          startDate: series.startDate,
          endDate: series.endDate,
          dateFilter: {
            ...series.dateFilter,
          },
          measurement: series.measurement,
          comparison: series.comparison,
          threshold: series.threshold,
          aggregation: series.aggregation,
          avgFrequency: series.avgFrequency,
          groupBy: chart.groupBy,
          movingAverageWindow: series.movingAverageWindow ?? legacyWindow ?? null,
        };

        return this.weatherApi
          .analyze(analysis)
          .pipe(map((points) => buildGraphSeries(seriesId, analysis, points, series.title)));
      });

      return forkJoin(seriesRequests).pipe(
        map((graphSeries) => ({
          chartId: chartIndex + 1,
          name: chart.name ?? '',
          comments: chart.comments,
          chartType: chart.chartType ?? 'line',
          pendingChartType: chart.chartType ?? 'line',
          metricUnits: chart.metricUnits === true,
          groupBy: chart.groupBy,
          chartWideEdit: false,
          seriesInputs: [],
          graphSeries,
        })),
      );
    });

    return forkJoin(chartRequests);
  }
}
