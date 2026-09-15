import { environment } from '../../../environments/environment';

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import type { LocationResponse } from '../models/location.models';

@Injectable({
  providedIn: 'root',
})
export class LocationApi {
  private readonly http = inject(HttpClient);

  private readonly locationsUrl = `${environment.apiBaseUrl}/locations`;

  search(city: string): Observable<LocationResponse> {
    const params = new HttpParams().set('city', city);

    return this.http.get<LocationResponse>(this.locationsUrl, { params });
  }
}
