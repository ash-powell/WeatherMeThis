import type { AnalysisRequest } from './weather.models.js';

const millisecondsPerDay = 24 * 60 * 60 * 1_000;
const baselineDays = 14;
const baselineVariables = 10;

export const openMeteoConfirmationThreshold = 600;
export const openMeteoMinuteBudget = 590;
export const openMeteoWindowMs = 61_000;

export function estimateOpenMeteoCallCost(request: AnalysisRequest): number {
  const start = Date.parse(`${request.startDate}T00:00:00Z`);
  const end = Date.parse(`${request.endDate}T00:00:00Z`);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return 1;
  }

  const inclusiveDays = Math.floor((end - start) / millisecondsPerDay) + 1;

  // WeatherMeThis requests one daily variable, one location, and the default
  // model. Open-Meteo weights calls by duration, variables, models, and locations.
  return Math.max(1, (inclusiveDays / baselineDays) * (1 / baselineVariables));
}

export function rawWeatherRequestKey(request: AnalysisRequest): string {
  return JSON.stringify([
    request.location.latitude,
    request.location.longitude,
    request.measurement,
    request.startDate,
    request.endDate,
  ]);
}
