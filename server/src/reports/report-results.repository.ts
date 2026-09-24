import { ObjectId } from 'mongodb';

import type { ClientSession } from 'mongodb';

import { getDatabase } from '../database/mongodb.js';

import type { ReportChart, ReportSeriesResult } from './report.models.js';

interface StoredReportSeriesResult extends ReportSeriesResult {
  reportId: ObjectId;
  chartIndex: number;
  seriesIndex: number;
}

function resultCollection() {
  return getDatabase().collection<StoredReportSeriesResult>(
    'savedReportSeriesResults',
  );
}

export async function ensureReportResultIndexes(): Promise<void> {
  await resultCollection().createIndex(
    { reportId: 1, chartIndex: 1, seriesIndex: 1 },
    { name: 'one_result_per_report_chart_series', unique: true },
  );
}

export async function replaceReportResults(
  reportId: ObjectId,
  charts: ReportChart[],
  session: ClientSession,
): Promise<void> {
  await resultCollection().deleteMany({ reportId }, { session });

  const documents: StoredReportSeriesResult[] = [];

  charts.forEach((chart, chartIndex) => {
    chart.renderedSeries?.forEach((result, seriesIndex) => {
      if (result) {
        documents.push({
          reportId,
          chartIndex,
          seriesIndex,
          ...result,
        });
      }
    });
  });

  if (documents.length > 0) {
    await resultCollection().insertMany(documents, { session });
  }
}

export async function deleteReportResults(
  reportIds: ObjectId | ObjectId[],
  session: ClientSession,
): Promise<void> {
  const ids = Array.isArray(reportIds) ? reportIds : [reportIds];

  if (ids.length > 0) {
    await resultCollection().deleteMany(
      { reportId: { $in: ids } },
      { session },
    );
  }
}

export async function attachReportResults<
  T extends { _id: ObjectId; charts: ReportChart[] },
>(report: T): Promise<T> {
  const results = await resultCollection()
    .find({ reportId: report._id })
    .sort({ chartIndex: 1, seriesIndex: 1 })
    .toArray();

  const resultByPosition = new Map(
    results.map((result) => [
      `${result.chartIndex}:${result.seriesIndex}`,
      result,
    ]),
  );

  return {
    ...report,
    charts: report.charts.map((chart, chartIndex) => ({
      ...chart,
      renderedSeries: chart.seriesArray.map((_series, seriesIndex) => {
        const result = resultByPosition.get(`${chartIndex}:${seriesIndex}`);

        if (!result) {
          return null;
        }

        return {
          label: result.label,
          yAxisId: result.yAxisId,
          yAxisLabel: result.yAxisLabel,
          ...(result.requestKey ? { requestKey: result.requestKey } : {}),
          dates: result.dates,
          values: result.values,
        };
      }),
    })),
  };
}
