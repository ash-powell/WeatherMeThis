import { MEASUREMENTS, measurementUnit } from '../models/measurement.models';
import type { AnalysisRequest, Aggregation, Measurement } from '../models/analysis.models';

import type { GraphPoint, GraphSeries } from '../models/graph.models';

import { analysisRequestKey } from './analysis-request-key';

interface YAxisInfo {
  id: string;
  label: string;
}

function getYAxisInfo(analysis: AnalysisRequest): YAxisInfo {
  if (analysis.aggregation === 'count' || analysis.aggregation === 'avgCnt') {
    return {
      id: 'count',
      label: 'Count',
    };
  }

  const metric = analysis.metricUnits === true;
  const kind = MEASUREMENTS[analysis.measurement].kind;
  const unit = measurementUnit(analysis.measurement, metric);
  const quantity = {
    temperature: 'Temperature',
    water: 'Depth',
    snow: 'Depth',
    speed: 'Wind speed',
    hours: 'Duration',
    seconds: 'Duration',
    direction: 'Wind direction',
    radiation: 'Solar radiation',
    code: 'Weather condition',
  }[kind];
  return { id: `${quantity}-${unit}`, label: `${quantity} (${unit})` };
}

function getMeasurementLabel(measurement: Measurement): string {
  return MEASUREMENTS[measurement].label;
}

function getAggregationLabel(aggregation: Aggregation): string {
  switch (aggregation) {
    case 'count':
      return 'Count';

    case 'sum':
      return 'Sum';

    case 'min':
      return 'Min';

    case 'max':
      return 'Max';

    case 'avgSum':
      return 'Average Amount';

    case 'avgCnt':
      return 'Average Number of';

    case 'rawValues':
      return 'All days of';

    case 'avgMatchingDays':
      return 'Average on Matching Days';
  }
}

export function buildGraphSeries(
  seriesId: number,
  analysis: AnalysisRequest,
  points: GraphPoint[],
  title?: string,
): GraphSeries {
  const yAxis = getYAxisInfo(analysis);

  return {
    seriesId,

    label:
      title?.trim() ||
      `${analysis.location.city} ` +
        `${getMeasurementLabel(analysis.measurement)} ` +
        `${getAggregationLabel(analysis.aggregation)}`,

    points,
    yAxisId: yAxis.id,
    yAxisLabel: yAxis.label,
    requestKey: analysisRequestKey(analysis),
  };
}

export function upsertGraphSeries(current: GraphSeries[], incoming: GraphSeries): GraphSeries[] {
  const updated = current.some((series) => series.seriesId === incoming.seriesId)
    ? current.map((series) => (series.seriesId === incoming.seriesId ? incoming : series))
    : [...current, incoming];

  return updated.sort((first, second) => first.seriesId - second.seriesId);
}
