import { environment } from '../../../environments/environment';

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import type { ReportRequest, SavedReport, SavedReportSummary } from '../models/report.models';

export interface SaveReportResponse {
  message: string;
  insertedId: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReportApi {
  private readonly http = inject(HttpClient);

  private readonly reportsUrl = `${environment.apiBaseUrl}/reports`;

  save(report: ReportRequest): Observable<SaveReportResponse> {
    return this.http.post<SaveReportResponse>(this.reportsUrl, report);
  }

  getAll(): Observable<SavedReportSummary[]> {
    return this.http.get<SavedReportSummary[]>(this.reportsUrl);
  }

  getById(reportId: string): Observable<SavedReport> {
    return this.http.get<SavedReport>(`${this.reportsUrl}/${reportId}`);
  }

  update(reportId: string, report: ReportRequest): Observable<unknown> {
    return this.http.put(`${this.reportsUrl}/${reportId}`, report);
  }

  delete(reportId: string): Observable<unknown> {
    return this.http.delete(`${this.reportsUrl}/${reportId}`);
  }
}
