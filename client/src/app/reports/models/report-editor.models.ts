import type { QueryLocation } from '../../locations/models/location.models';

import type { GraphSeries } from '../../weather/models/graph.models';

import type { ChartType } from '../../weather/models/chart.models';

import type {
  Aggregation,
  AvgFrequency,
  Comparison,
  DateFilter,
  GroupBy,
  Measurement,
} from '../../weather/models/analysis.models';

export interface ChartInput {
  chartId: number;
  name: string;
  comments: string;
  chartType: ChartType;
  pendingChartType: ChartType;
  groupBy: GroupBy | null;
  chartWideEdit: boolean;
  metricUnits: boolean;
  seriesInputs: SeriesInput[];
  graphSeries: GraphSeries[];
}

export type SharedSeriesField =
  | 'startDate'
  | 'endDate'
  | 'measurement'
  | 'aggregation'
  | 'avgFrequency'
  | 'comparison'
  | 'threshold';

export type DateFilterField = keyof DateFilter;

export interface ReportInput {
  name: string;
  charts: ChartInput[];
}

export type HelpTopic = 'aggregation' | 'groupBy' | 'dateFilter' | 'comparison';

export interface SeriesInput {
  title?: string;
  seriesId: number;
  expanded: boolean;

  city: string | null;
  admin1: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  locations: QueryLocation[];
  locationSearch: string;

  startDate: string;
  endDate: string;
  dateFilter: DateFilter;

  measurement: Measurement | null;
  aggregation: Aggregation | null;
  avgFrequency: AvgFrequency | null;
  comparison: Comparison | null;
  threshold: number | null;
}
