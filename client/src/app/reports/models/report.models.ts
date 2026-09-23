import type {
  Aggregation,
  AvgFrequency,
  Comparison,
  DateFilter,
  GroupBy,
  Measurement,
} from '../../weather/models/analysis.models';

import type { ChartType } from '../../weather/models/chart.models';

export interface ReportSeries {
  title?: string;
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
  movingAverageWindow?: number | null;
}

export interface ReportChart {
  metricUnits?: boolean;
  name: string | null;
  comments: string;
  chartType: ChartType;
  groupBy: GroupBy;
  seriesArray: ReportSeries[];
}

export interface ReportRequest {
  name: string;
  charts: ReportChart[];
}

export interface SavedReport extends ReportRequest {
  _id: string;
  createdAt: string;
  isPublic: boolean;
  publishedAt: string | null;
  likeCount: number;
}
