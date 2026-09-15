import type { Measurement } from './weather.models.js';

export const MEASUREMENTS = {
  temperature_2m_max: { label: 'High temperature', kind: 'temperature' },
  temperature_2m_min: { label: 'Low temperature', kind: 'temperature' },
  apparent_temperature_max: {
    label: 'High apparent temperature',
    kind: 'temperature',
  },
  apparent_temperature_min: {
    label: 'Low apparent temperature',
    kind: 'temperature',
  },
  precipitation_sum: { label: 'Total precipitation', kind: 'water' },
  rain_sum: { label: 'Rain', kind: 'water' },
  snowfall_sum: { label: 'Snowfall', kind: 'snow' },
  precipitation_hours: { label: 'Precipitation hours', kind: 'hours' },
  sunshine_duration: { label: 'Sunshine duration', kind: 'seconds' },
  daylight_duration: { label: 'Daylight duration', kind: 'seconds' },
  wind_speed_10m_max: { label: 'Maximum wind speed', kind: 'speed' },
  wind_gusts_10m_max: { label: 'Maximum wind gusts', kind: 'speed' },
  wind_direction_10m_dominant: {
    label: 'Dominant wind direction',
    kind: 'direction',
  },
  shortwave_radiation_sum: { label: 'Shortwave radiation', kind: 'radiation' },
  et0_fao_evapotranspiration: {
    label: 'Reference evapotranspiration (ET₀)',
    kind: 'water',
  },
  weather_code: { label: 'Weather condition (WMO code)', kind: 'code' },
} as const satisfies Record<Measurement, { label: string; kind: string }>;

export const measurementNames = Object.keys(MEASUREMENTS) as Measurement[];
export const measurementOptions = measurementNames.map((value) => ({
  value,
  label: MEASUREMENTS[value].label,
}));

export function measurementUnit(measurement: Measurement, metric: boolean): string {
  switch (MEASUREMENTS[measurement].kind) {
    case 'temperature':
      return metric ? '°C' : '°F';
    case 'water':
      return metric ? 'mm' : 'in';
    case 'snow':
      return metric ? 'cm' : 'in';
    case 'speed':
      return metric ? 'km/h' : 'mph';
    case 'hours':
    case 'seconds':
      return 'h';
    case 'direction':
      return '°';
    case 'radiation':
      return 'MJ/m²';
    case 'code':
      return 'WMO code';
  }
}

// Use a consistent numeric precision for converted measurements.
function clean(value: number): number {
  return Number(value.toFixed(10));
}

// Open-Meteo is always requested in Celsius, millimetres and km/h.
// Snowfall is returned in centimetres under the metric precipitation setting.
export function convertFromMetric(
  value: number,
  measurement: Measurement,
  metric: boolean,
): number {
  const kind = MEASUREMENTS[measurement].kind;
  if (kind === 'seconds') return value / 3600;
  if (metric) return value;
  switch (kind) {
    case 'temperature':
      return clean((value * 9) / 5 + 32);
    case 'water':
      return clean(value / 25.4);
    case 'snow':
      return clean(value / 2.54);
    case 'speed':
      return clean(value / 1.609344);
    default:
      return value;
  }
}
