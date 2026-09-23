import { convertFromMetric, MEASUREMENTS } from './measurement.models.js';
import { analyzeWeather } from './domain/weather-analysis.js';

import type {
  AnalysisOptions,
  AnalysisRequest,
  GraphPoint,
  WeatherData,
} from './weather.models.js';

export class WeatherUpstreamError extends Error {
  constructor(
    readonly status: 502 | 504,
    readonly publicMessage: string,
    message = publicMessage,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'WeatherUpstreamError';
  }
}

const OPEN_METEO_TIMEOUT_MS = 30_000;

const OPEN_METEO_UNAVAILABLE_MESSAGE =
  'Unable to retrieve weather data from Open-Meteo. Please try again shortly.';

const OPEN_METEO_INVALID_RESPONSE_MESSAGE =
  'Open-Meteo returned an invalid response. Please try again shortly.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeWeatherData(value: unknown, measurement: string): WeatherData {
  if (!isRecord(value) || !isRecord(value.daily)) {
    throw new WeatherUpstreamError(
      502,
      OPEN_METEO_INVALID_RESPONSE_MESSAGE,
      'Open-Meteo returned invalid weather data',
    );
  }

  const dates = value.daily.time;
  const measurements = value.daily[measurement];

  if (
    !Array.isArray(dates) ||
    !dates.every((date) => typeof date === 'string') ||
    !Array.isArray(measurements) ||
    !measurements.every(
      (measurementValue) =>
        measurementValue === null ||
        (typeof measurementValue === 'number' && Number.isFinite(measurementValue)),
    ) ||
    dates.length !== measurements.length
  ) {
    throw new WeatherUpstreamError(
      502,
      OPEN_METEO_INVALID_RESPONSE_MESSAGE,
      'Open-Meteo returned invalid weather data',
    );
  }

  return {
    dates,
    values: measurements,
  };
}

async function retrieveWeatherData(request: AnalysisRequest): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: request.location.latitude.toString(),
    longitude: request.location.longitude.toString(),
    start_date: request.startDate,
    end_date: request.endDate,
    daily: request.measurement,
    timezone: 'America/New_York',
    temperature_unit: 'celsius',
    precipitation_unit: 'mm',
    wind_speed_unit: 'kmh',
  });

  const url = 'https://archive-api.open-meteo.com/' + `v1/archive?${params}`;

  const timeoutSignal = AbortSignal.timeout(OPEN_METEO_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(url, {
      signal: timeoutSignal,
    });
  } catch (error) {
    if (timeoutSignal.aborted) {
      throw new WeatherUpstreamError(
        504,
        'Open-Meteo is taking too long to respond. Please try again shortly.',
        `Open-Meteo request timed out after ${OPEN_METEO_TIMEOUT_MS} ms`,
        { cause: error },
      );
    }

    throw new WeatherUpstreamError(
      502,
      'Unable to connect to Open-Meteo. Please try again shortly.',
      'Open-Meteo network request failed',
      { cause: error },
    );
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new WeatherUpstreamError(
        502,
        'Open-Meteo is temporarily limiting requests. Please try again shortly.',
        `Open-Meteo returned ${response.status} ${response.statusText}`,
      );
    }

    throw new WeatherUpstreamError(
      502,
      OPEN_METEO_UNAVAILABLE_MESSAGE,
      `Open-Meteo returned ${response.status} ${response.statusText}`,
    );
  }

  let data: unknown;

  try {
    data = await response.json();
  } catch (error) {
    throw new WeatherUpstreamError(
      502,
      OPEN_METEO_INVALID_RESPONSE_MESSAGE,
      'Open-Meteo returned malformed JSON',
      { cause: error },
    );
  }

  const normalized = normalizeWeatherData(data, request.measurement);
  return {
    dates: normalized.dates,
    values: normalized.values.map((value) =>
      value === null ? null : convertFromMetric(value, request.measurement, request.metricUnits),
    ),
  };
}

export async function analyzeWeatherRequest(request: AnalysisRequest): Promise<GraphPoint[]> {
  const weatherData = await retrieveWeatherData(request);

  const analysisOptions: AnalysisOptions = {
    comparison: request.comparison,
    threshold: request.threshold,
    aggregation: request.aggregation,
    avgFrequency: request.avgFrequency,
    groupBy: request.groupBy,
    movingAverageWindow: request.movingAverageWindow,
    startDate: request.startDate,
    endDate: request.endDate,
    dateFilter: request.dateFilter,
  };

  const points = analyzeWeather(weatherData, analysisOptions);
  // Round duration results after aggregation, never daily values used in sums or comparisons.
  const kind = MEASUREMENTS[request.measurement].kind;
  if (
    (kind === 'seconds' || kind === 'hours') &&
    request.aggregation !== 'count' &&
    request.aggregation !== 'avgCnt'
  ) {
    return points.map((point) => ({
      ...point,
      value: point.value === null ? null : Number(point.value.toFixed(2)),
    }));
  }
  return points;
}
