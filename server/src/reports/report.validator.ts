import type {
  ChartType,
  ReportChart,
  ReportRequest,
  ReportSeries,
  ReportSeriesResult,
} from './report.models.js';

import {
  hasValidMovingAverageOptions,
  isGroupBy,
  validateAnalysisSeries,
} from '../weather/weather.validator.js';

function readChartType(value: unknown): ChartType | null {
  if (value === undefined) {
    return 'line';
  }

  return value === 'line' || value === 'bar' ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateRenderedSeries(value: unknown): ReportSeriesResult | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.label !== 'string' ||
    value.label.length > 200 ||
    typeof value.yAxisId !== 'string' ||
    value.yAxisId.length > 100 ||
    typeof value.yAxisLabel !== 'string' ||
    value.yAxisLabel.length > 100 ||
    (value.requestKey !== undefined &&
      (typeof value.requestKey !== 'string' ||
        value.requestKey.length > 2_000)) ||
    !Array.isArray(value.dates) ||
    !Array.isArray(value.values) ||
    value.dates.length !== value.values.length ||
    value.dates.length > 100_000 ||
    !value.dates.every(
      (date) => typeof date === 'string' && date.length <= 32,
    ) ||
    !value.values.every(
      (pointValue) =>
        pointValue === null ||
        (typeof pointValue === 'number' && Number.isFinite(pointValue)),
    )
  ) {
    return null;
  }

  return {
    label: value.label,
    yAxisId: value.yAxisId,
    yAxisLabel: value.yAxisLabel,
    ...(typeof value.requestKey === 'string'
      ? { requestKey: value.requestKey }
      : {}),
    dates: value.dates,
    values: value.values,
  };
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

    if (
      chartValue.metricUnits !== undefined &&
      typeof chartValue.metricUnits !== 'boolean'
    )
      return null;

    const groupBy = chartValue.groupBy;
    const chartType = readChartType(chartValue.chartType);
    const legacyMovingAverageWindow = chartValue.movingAverageWindow ?? null;

    if (
      legacyMovingAverageWindow !== null &&
      (typeof legacyMovingAverageWindow !== 'number' ||
        !Number.isFinite(legacyMovingAverageWindow))
    ) {
      return null;
    }

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

      if (!series || !isRecord(seriesValue)) {
        return null;
      }

      const movingAverageWindow =
        seriesValue.movingAverageWindow ?? legacyMovingAverageWindow ?? null;

      if (
        movingAverageWindow !== null &&
        (typeof movingAverageWindow !== 'number' ||
          !Number.isFinite(movingAverageWindow))
      ) {
        return null;
      }

      if (
        !hasValidMovingAverageOptions(
          movingAverageWindow,
          groupBy,
          series.dateFilter.unit,
        )
      ) {
        return null;
      }

      if (
        seriesValue.title !== undefined &&
        (typeof seriesValue.title !== 'string' ||
          seriesValue.title.length > 100)
      ) {
        return null;
      }
      seriesArray.push({
        ...series,
        title:
          typeof seriesValue.title === 'string' ? seriesValue.title.trim() : '',
        movingAverageWindow,
      });
    }

    let renderedSeries: Array<ReportSeriesResult | null> | undefined;

    if (chartValue.renderedSeries !== undefined) {
      if (
        !Array.isArray(chartValue.renderedSeries) ||
        chartValue.renderedSeries.length !== seriesArray.length
      ) {
        return null;
      }

      renderedSeries = [];

      for (const resultValue of chartValue.renderedSeries) {
        if (resultValue === null) {
          renderedSeries.push(null);
          continue;
        }

        const result = validateRenderedSeries(resultValue);

        if (!result) {
          return null;
        }

        renderedSeries.push(result);
      }
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
      ...(renderedSeries ? { renderedSeries } : {}),
    });
  }

  return {
    name: value.name.trim(),
    charts,
  };
}
