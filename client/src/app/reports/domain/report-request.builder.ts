import type { ReportInput } from '../models/report-editor.models';

import type { ReportRequest, ReportSeries } from '../models/report.models';

import type { AnalysisRequest, GroupBy } from '../../weather/models/analysis.models';

import type { BuildResult } from './build-result';

import { buildAnalysisRequest } from './analysis-request.builder';

export function buildReportRequest(report: ReportInput): BuildResult<ReportRequest> {
  const name = report.name.trim();

  if (!name) {
    return {
      ok: false,
      error: 'Please enter a story name',
    };
  }

  if (name.length > 60) {
    return {
      ok: false,
      error: 'Story names must be 60 characters or fewer',
    };
  }

  if (report.charts.length === 0) {
    return {
      ok: false,
      error: 'A story must contain at least one chart',
    };
  }

  const charts: ReportRequest['charts'] = [];

  for (const chart of report.charts) {
    if (!chart.groupBy) {
      return {
        ok: false,
        error: 'Every chart requires a date grouping',
      };
    }

    if (chart.seriesInputs.length === 0) {
      return {
        ok: false,
        error: 'Every chart requires at least one series',
      };
    }

    const seriesArray: ReportSeries[] = [];

    for (const series of chart.seriesInputs) {
      const analysisResult = buildAnalysisRequest(series, chart.groupBy, chart.metricUnits);

      if (!analysisResult.ok) {
        return analysisResult;
      }

      const analysis = analysisResult.value;

      seriesArray.push({
        title: series.title?.trim() || '',
        location: analysis.location,
        startDate: analysis.startDate,
        endDate: analysis.endDate,
        dateFilter: analysis.dateFilter,
        measurement: analysis.measurement,
        comparison: analysis.comparison,
        threshold: analysis.threshold,
        aggregation: analysis.aggregation,
        avgFrequency: analysis.avgFrequency,
      });
    }

    charts.push({
      name: chart.name.trim() || null,
      comments: chart.comments,
      chartType: chart.chartType,
      metricUnits: chart.metricUnits,
      groupBy: chart.groupBy,
      seriesArray,
    });
  }

  return {
    ok: true,

    value: {
      name,
      charts,
    },
  };
}
