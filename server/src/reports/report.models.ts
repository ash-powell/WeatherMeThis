import type { AnalysisSeries, GroupBy } from '../weather/weather.models.js';

export interface ReportSearchFacet {
  city: string;
  cityNormalized: string;
  measurement: AnalysisSeries['measurement'];
}

export interface ReportSeries extends AnalysisSeries {
  title?: string;
  movingAverageWindow: number | null;
}

export interface ReportSeriesResult {
  label: string;
  yAxisId: string;
  yAxisLabel: string;
  requestKey?: string;
  dates: string[];
  values: Array<number | null>;
}

export type ChartType = 'line' | 'bar';

export interface ReportChart {
  metricUnits?: boolean;
  name: string | null;
  comments: string;
  chartType: ChartType;
  groupBy: GroupBy;
  seriesArray: ReportSeries[];
  renderedSeries?: Array<ReportSeriesResult | null>;
}

export interface ReportRequest {
  name: string;
  charts: ReportChart[];
}

export interface SavedReport extends ReportRequest {
  auth0UserId: string;
  createdAt: Date;
  isPublic: boolean;
  publishedAt: Date | null;
  likeCount: number;
  searchFacets: ReportSearchFacet[];
}
