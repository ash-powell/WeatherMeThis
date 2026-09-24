import type { AnalysisRequest } from '../models/analysis.models';

// This fingerprint describes the complete calculation that produced chart points.
// Raw server-cache identity intentionally uses fewer fields.
export function analysisRequestKey(request: AnalysisRequest): string {
  return JSON.stringify([
    request.metricUnits,
    request.location.latitude,
    request.location.longitude,
    request.startDate,
    request.endDate,
    request.dateFilter.unit,
    request.dateFilter.min,
    request.dateFilter.max,
    request.measurement,
    request.comparison,
    request.threshold,
    request.aggregation,
    request.avgFrequency,
    request.groupBy,
    request.movingAverageWindow,
  ]);
}
