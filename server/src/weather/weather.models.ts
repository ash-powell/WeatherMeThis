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

export type DateFilterUnit =
  'day' | 'monthDay' | 'month' | 'yearMonth' | 'year' | 'none';

export interface DateFilter {
  unit: DateFilterUnit;
  min: string;
  max: string;
}

export type Month =
  | '01'
  | '02'
  | '03'
  | '04'
  | '05'
  | '06'
  | '07'
  | '08'
  | '09'
  | '10'
  | '11'
  | '12';

export type GroupBy =
  'year' | 'month' | 'day' | 'yearMonth' | 'monthDay' | 'yearMonthDay' | 'all';

export type Aggregation =
  | 'count'
  | 'sum'
  | 'min'
  | 'max'
  | 'avgSum'
  | 'avgCnt'
  | 'avgMatchingDays'
  | 'rawValues';

export type Comparison = '>' | '>=' | '<' | '<=' | '=' | 'none';

export type AvgFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none';

export interface AnalysisLocation {
  city: string;
  admin1: string | null;
  country: string;
  latitude: number;
  longitude: number;
}

export interface AnalysisSeries {
  location: AnalysisLocation;
  startDate: string;
  endDate: string;
  dateFilter: DateFilter;
  measurement: Measurement;
  comparison: Comparison;
  threshold: number | null;
  aggregation: Aggregation;
  avgFrequency: AvgFrequency;
}

export interface AnalysisRequest extends AnalysisSeries {
  metricUnits: boolean;
  groupBy: GroupBy;
  movingAverageWindow: number | null;
}

export interface AnalysisOptions {
  groupBy: GroupBy;
  movingAverageWindow: number | null;
  aggregation: Aggregation;
  avgFrequency: AvgFrequency;
  comparison: Comparison;
  threshold: number | null;
  dateFilter: DateFilter;
  startDate: string;
  endDate: string;
}

export interface WeatherData {
  values: (number | null)[];
  dates: string[];
}

export interface GraphPoint {
  date: string;
  value: number | null;
}

export interface WeatherRequestPlan {
  cacheMisses: number;
  estimatedOpenMeteoCalls: number;
  requiresConfirmation: boolean;
}
