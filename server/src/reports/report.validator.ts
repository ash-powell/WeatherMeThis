import type { ChartType, ReportChart, ReportRequest, ReportSeries } from './report.models.js';

import { isGroupBy, validateAnalysisSeries } from '../weather/weather.validator.js';

function readChartType(value: unknown): ChartType | null {
  if (value === undefined) {
    return 'line';
  }

  return value === 'line' || value === 'bar' ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateReportRequest(value: unknown): ReportRequest | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.name !== 'string' ||
    value.name.trim().length === 0 ||
    value.name.trim().length > 60 ||
    !Array.isArray(value.charts) ||
    value.charts.length === 0
  ) {
    return null;
  }

  const charts: ReportChart[] = [];

  for (const chartValue of value.charts) {
    if (!isRecord(chartValue)) {
      return null;
    }

    if (chartValue.name !== null && typeof chartValue.name !== 'string') {
      return null;
    }

    if (chartValue.metricUnits !== undefined && typeof chartValue.metricUnits !== 'boolean')
      return null;

    const groupBy = chartValue.groupBy;
    const chartType = readChartType(chartValue.chartType);

    if (
      !chartType ||
      !isGroupBy(groupBy) ||
      !Array.isArray(chartValue.seriesArray) ||
      chartValue.seriesArray.length === 0 ||
      typeof chartValue.comments !== 'string' ||
      chartValue.comments.length > 10000
    ) {
      return null;
    }

    const seriesArray: ReportSeries[] = [];

    for (const seriesValue of chartValue.seriesArray) {
      const series = validateAnalysisSeries(seriesValue, groupBy);

      if (!series) {
        return null;
      }

      if (
        !isRecord(seriesValue) ||
        (seriesValue.title !== undefined &&
          (typeof seriesValue.title !== 'string' || seriesValue.title.length > 100))
      ) {
        return null;
      }
      seriesArray.push({
        ...series,
        title: typeof seriesValue.title === 'string' ? seriesValue.title.trim() : '',
      });
    }

    charts.push({
      name:
        typeof chartValue.name === 'string' && chartValue.name.trim().length > 0
          ? chartValue.name.trim()
          : null,

      comments: chartValue.comments,
      chartType,
      metricUnits: chartValue.metricUnits === true,
      groupBy,
      seriesArray,
    });
  }

  return {
    name: value.name.trim(),
    charts,
  };
}
