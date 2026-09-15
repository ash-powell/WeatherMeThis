import { environment } from '../../../environments/environment';

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import type { AnalysisRequest } from '../models/analysis.models';
import type { GraphPoint } from '../models/graph.models';

@Injectable({
  providedIn: 'root',
})
export class WeatherApi {
  private readonly http = inject(HttpClient);

  private readonly weatherUrl = `${environment.apiBaseUrl}/weather`;

  analyze(analysis: AnalysisRequest): Observable<GraphPoint[]> {
    return this.http.post<GraphPoint[]>(this.weatherUrl, analysis);
  }
}
