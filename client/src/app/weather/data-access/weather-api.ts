import { environment } from '../../../environments/environment';

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import type { AnalysisRequest } from '../models/analysis.models';
import type { GraphPoint } from '../models/graph.models';

export interface WeatherRequestPlan {
  cacheMisses: number;
  estimatedOpenMeteoCalls: number;
  requiresConfirmation: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class WeatherApi {
  private readonly http = inject(HttpClient);

  private readonly weatherUrl = `${environment.apiBaseUrl}/weather`;

  analyze(analysis: AnalysisRequest): Observable<GraphPoint[]> {
    return this.http.post<GraphPoint[]>(this.weatherUrl, analysis);
  }

  plan(analyses: AnalysisRequest[]): Observable<WeatherRequestPlan> {
    return this.http.post<WeatherRequestPlan>(`${this.weatherUrl}/plan`, { analyses });
  }
}
