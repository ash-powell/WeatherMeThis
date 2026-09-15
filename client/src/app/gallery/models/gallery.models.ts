import type { Measurement } from '../../weather/models/analysis.models';

import type { ReportChart } from '../../reports/models/report.models';

import type { ChartInput } from '../../reports/models/report-editor.models';

export type GallerySort = 'newest' | 'oldest' | 'popular';

export interface GallerySearchQuery {
  city: string;
  measurement: Measurement | '';
  name: string;
  sort: GallerySort;
  page: number;
  pageSize: number;
}

export interface GalleryReportSummary {
  _id: string;
  name: string;
  authorDisplayName: string;
  publishedAt: string;
  likeCount: number;
  likedByCurrentUser: boolean;
  cities: string[];
  measurements: Measurement[];
  chartCount: number;
}

export interface PublicGalleryReport {
  _id: string;
  name: string;
  charts: ReportChart[];
  authorDisplayName: string;
  publishedAt: string;
  likeCount: number;
  likedByCurrentUser: boolean;
}

export interface GallerySearchResponse {
  reports: GalleryReportSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PublicationResponse {
  isPublic: true;
  publishedAt: string;
}

export interface PublicReportView {
  report: PublicGalleryReport;
  charts: ChartInput[];
}
