import type { Measurement } from '../weather/weather.models.js';

import type { ReportChart } from '../reports/report.models.js';

export type GallerySort = 'newest' | 'oldest' | 'popular';

export interface GalleryQuery {
  city: string | null;
  measurement: Measurement | null;
  name: string | null;
  sort: GallerySort;
  page: number;
  pageSize: number;
}

export interface GalleryReportSummary {
  _id: string;
  name: string;
  authorDisplayName: string;
  publishedAt: Date;
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
  publishedAt: Date;
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
