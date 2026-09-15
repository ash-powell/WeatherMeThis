import { environment } from '../../../environments/environment';

import { inject, Injectable } from '@angular/core';

import { HttpClient, HttpParams } from '@angular/common/http';

import type { Observable } from 'rxjs';

import type {
  GallerySearchQuery,
  GallerySearchResponse,
  PublicGalleryReport,
  PublicationResponse,
} from '../models/gallery.models';

@Injectable({
  providedIn: 'root',
})
export class GalleryApi {
  private readonly http = inject(HttpClient);

  private readonly galleryUrl = `${environment.apiBaseUrl}/gallery`;

  search(query: GallerySearchQuery): Observable<GallerySearchResponse> {
    let params = new HttpParams()
      .set('sort', query.sort)
      .set('page', query.page)
      .set('pageSize', query.pageSize);

    if (query.city.trim()) {
      params = params.set('city', query.city.trim());
    }

    if (query.measurement) {
      params = params.set('measurement', query.measurement);
    }

    if (query.name.trim()) {
      params = params.set('name', query.name.trim());
    }

    return this.http.get<GallerySearchResponse>(this.galleryUrl, {
      params,
    });
  }

  getById(reportId: string): Observable<PublicGalleryReport> {
    return this.http.get<PublicGalleryReport>(`${this.galleryUrl}/${reportId}`);
  }

  publish(reportId: string): Observable<PublicationResponse> {
    return this.http.put<PublicationResponse>(`${this.galleryUrl}/${reportId}/publication`, {});
  }

  unpublish(reportId: string): Observable<void> {
    return this.http.delete<void>(`${this.galleryUrl}/${reportId}/publication`);
  }

  like(reportId: string): Observable<{ liked: true }> {
    return this.http.post<{ liked: true }>(`${this.galleryUrl}/${reportId}/like`, {});
  }

  unlike(reportId: string): Observable<void> {
    return this.http.delete<void>(`${this.galleryUrl}/${reportId}/like`);
  }

  getLikedReportIds(reportIds: string[]): Observable<{ reportIds: string[] }> {
    return this.http.post<{ reportIds: string[] }>(`${this.galleryUrl}/likes/status`, {
      reportIds,
    });
  }
}
