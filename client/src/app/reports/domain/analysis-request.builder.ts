import type { SeriesInput } from '../models/report-editor.models';

import type { AnalysisRequest, GroupBy } from '../../weather/models/analysis.models';

import type { BuildResult } from './build-result';

export function validateAnalysis(series: SeriesInput, groupBy: GroupBy | null): string | null {
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
  const error = validateAnalysis(series, groupBy);

  if (error) {
    return {
      ok: false,
      error,
    };
  }

  const isAverage = series.aggregation === 'avgCnt' || series.aggregation === 'avgSum';

  return {
    ok: true,

    value: {
      metricUnits,

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

      avgFrequency: isAverage ? series.avgFrequency! : 'none',

      groupBy: groupBy!,
    },
  };
}
