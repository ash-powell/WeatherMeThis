import type { SeriesInput } from '../models/report-editor.models';

import type { AnalysisRequest, GroupBy } from '../../weather/models/analysis.models';

import type { BuildResult } from './build-result';

const movingAverageDateFilters: Partial<
  Record<GroupBy, readonly SeriesInput['dateFilter']['unit'][]>
> = {
  year: ['none', 'month', 'monthDay', 'day'],
  yearMonth: ['none', 'day'],
  yearMonthDay: ['none'],
};

export function supportsMovingAverage(groupBy: GroupBy | null): boolean {
  return groupBy !== null && movingAverageDateFilters[groupBy] !== undefined;
}

export function validateAnalysis(
  series: SeriesInput,
  groupBy: GroupBy | null,
): string | null {
  const movingAverageWindow = series.movingAverageWindow ?? null;
  if (
    !series.city ||
    !series.country ||
    series.latitude === null ||
    series.longitude === null ||
    !series.startDate ||
    !series.endDate ||
    !groupBy ||
    !series.aggregation ||
    !series.avgFrequency ||
    !series.measurement ||
    !series.comparison
  ) {
    return 'Please complete all required analysis fields.';
  }

  if (series.comparison !== 'none' && series.threshold === null) {
    return `${series.comparison} filter requires a number threshold value`;
  }

  if (series.aggregation === 'rawValues' && groupBy !== 'yearMonthDay') {
    return 'To show raw values, group dates by each day';
  }

  if (series.aggregation !== 'rawValues' && groupBy === 'yearMonthDay') {
    return "To see each day's value, choose aggregation: none";
  }

  if (
    (series.aggregation === 'avgCnt' || series.aggregation === 'avgSum') &&
    series.avgFrequency === 'none'
  ) {
    return 'Average frequency required by average aggregations';
  }

  if (series.aggregation === 'avgMatchingDays' && series.comparison === 'none') {
    return 'Average Matching Days aggregation requires a value filter.';
  }

  if (
    movingAverageWindow !== null &&
    (!Number.isInteger(movingAverageWindow) || movingAverageWindow < 2)
  ) {
    return 'Moving average window must be a whole number of at least 2.';
  }

  if (movingAverageWindow !== null && groupBy) {
    const permittedDateFilters = movingAverageDateFilters[groupBy];

    if (!permittedDateFilters) {
      return 'Moving averages require Group-by Year, Month of each year, or Exact date.';
    }

    if (!permittedDateFilters.includes(series.dateFilter.unit)) {
      return 'The selected date filter is not finer-grained than the moving-average Group-by.';
    }
  }

  if (series.startDate > series.endDate) {
    return 'End date must be after or the same as start date.';
  }

  return null;
}

export function buildAnalysisRequest(
  series: SeriesInput,
  groupBy: GroupBy | null,
  metricUnits = false,
): BuildResult<AnalysisRequest> {
  const movingAverageWindow = series.movingAverageWindow ?? null;
  const error = validateAnalysis(series, groupBy);

  if (error) {
    return {
      ok: false,
      error,
    };
  }

  return {
    ok: true,

    value: {
      metricUnits,
      movingAverageWindow,

      location: {
        city: series.city!,
        admin1: series.admin1,
        country: series.country!,
        latitude: series.latitude!,
        longitude: series.longitude!,
      },

      startDate: series.startDate,
      endDate: series.endDate,

      dateFilter: {
        ...series.dateFilter,
      },

      measurement: series.measurement!,
      comparison: series.comparison!,

      threshold: series.comparison === 'none' ? null : series.threshold,

      aggregation: series.aggregation!,

      avgFrequency:
        series.aggregation === 'avgMatchingDays'
          ? 'daily'
          : series.aggregation === 'avgSum' || series.aggregation === 'avgCnt'
            ? series.avgFrequency!
            : 'none',

      groupBy: groupBy!,
    },
  };
}
