export type Measurement =
  | 'temperature_2m_max'
  | 'temperature_2m_min'
  | 'apparent_temperature_max'
  | 'apparent_temperature_min'
  | 'precipitation_sum'
  | 'rain_sum'
  | 'snowfall_sum'
  | 'precipitation_hours'
  | 'sunshine_duration'
  | 'daylight_duration'
  | 'wind_speed_10m_max'
  | 'wind_gusts_10m_max'
  | 'wind_direction_10m_dominant'
  | 'shortwave_radiation_sum'
  | 'et0_fao_evapotranspiration'
  | 'weather_code';

export type GroupBy = 'year' | 'month' | 'day' | 'yearMonth' | 'monthDay' | 'yearMonthDay' | 'all';

export type Aggregation = 'count' | 'sum' | 'min' | 'max' | 'avgSum' | 'avgCnt' | 'rawValues';

export type Comparison = '>=' | '<=' | '=' | 'none';

export type AvgFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none';

export type DateFilterUnit = 'day' | 'monthDay' | 'month' | 'yearMonth' | 'year' | 'none';

export interface DateFilter {
  unit: DateFilterUnit;
  min: string;
  max: string;
}

export interface AnalysisRequest {
  metricUnits?: boolean;

  location: {
    city: string;
    admin1: string | null;
    country: string;
    latitude: number;
    longitude: number;
  };

  startDate: string;
  endDate: string;
  dateFilter: DateFilter;

  measurement: Measurement;
  comparison: Comparison;
  threshold: number | null;

  aggregation: Aggregation;
  avgFrequency: AvgFrequency;
  groupBy: GroupBy;
}
