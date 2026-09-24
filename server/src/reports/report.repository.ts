import { ObjectId } from 'mongodb';

import { getDatabase, getMongoClient } from '../database/mongodb.js';

import { buildSearchFacets } from '../gallery/gallery.repository.js';

import type { ReportRequest, SavedReport } from './report.models.js';

import {
  attachReportResults,
  deleteReportResults,
  ensureReportResultIndexes,
  replaceReportResults,
} from './report-results.repository.js';

function getReportCollection() {
  return getDatabase().collection<SavedReport>('savedReports');
}

export async function ensureReportIndexes(): Promise<void> {
  await Promise.all([
    getReportCollection().createIndex(
      { auth0UserId: 1, name: 1 },
      {
        name: 'unique_story_name_per_user',
        unique: true,
        collation: { locale: 'en', strength: 2 },
      },
    ),
    ensureReportResultIndexes(),
  ]);
}

function withoutRenderedResults(report: ReportRequest): ReportRequest {
  return {
    ...report,
    charts: report.charts.map(
      ({ renderedSeries: _renderedSeries, ...chart }) => chart,
    ),
  };
}

export async function createReport(
  report: ReportRequest,
  auth0UserId: string,
): Promise<ObjectId> {
  const session = getMongoClient().startSession();
  let insertedId: ObjectId | null = null;
  const savedReport: SavedReport = {
    ...withoutRenderedResults(report),
    auth0UserId,
    createdAt: new Date(),
    isPublic: false,
    publishedAt: null,
    likeCount: 0,
    searchFacets: [],
  };

  try {
    await session.withTransaction(async () => {
      const result = await getReportCollection().insertOne(savedReport, {
        session,
      });
      insertedId = result.insertedId;
      await replaceReportResults(result.insertedId, report.charts, session);
    });
  } finally {
    await session.endSession();
  }

  if (!insertedId) {
    throw new Error('Report transaction completed without an inserted ID');
  }

  return insertedId;
}

export async function findReportsByUser(auth0UserId: string) {
  return getReportCollection()
    .find(
      {
        auth0UserId,
      },
      {
        projection: {
          auth0UserId: 0,
          searchFacets: 0,
          charts: 0,
        },
      },
    )
    .sort({
      createdAt: -1,
    })
    .toArray();
}

export async function findReportById(reportId: ObjectId, auth0UserId: string) {
  const report = await getReportCollection().findOne(
    { _id: reportId, auth0UserId },
    { projection: { auth0UserId: 0, searchFacets: 0 } },
  );

  return report ? attachReportResults(report) : null;
}

export async function updateReportById(
  reportId: ObjectId,
  auth0UserId: string,
  report: ReportRequest,
): Promise<boolean> {
  const session = getMongoClient().startSession();
  let matched = false;

  try {
    await session.withTransaction(async () => {
      const definition = withoutRenderedResults(report);
      const result = await getReportCollection().updateOne(
        {
          _id: reportId,
          auth0UserId,
        },
        {
          $set: {
            ...definition,
            searchFacets: buildSearchFacets(definition),
          },
        },
        { session },
      );

      matched = result.matchedCount > 0;

      if (matched) {
        await replaceReportResults(reportId, report.charts, session);
      }
    });
  } finally {
    await session.endSession();
  }

  return matched;
}

export async function deleteReportById(
  reportId: ObjectId,
  auth0UserId: string,
): Promise<boolean> {
  const database = getDatabase();
  const session = getMongoClient().startSession();
  let deleted = false;

  try {
    await session.withTransaction(async () => {
      const result = await getReportCollection().deleteOne(
        {
          _id: reportId,
          auth0UserId,
        },
        {
          session,
        },
      );

      deleted = result.deletedCount > 0;

      if (deleted) {
        await deleteReportResults(reportId, session);

        await database.collection('reportLikes').deleteMany(
          {
            reportId,
          },
          {
            session,
          },
        );
      }
    });
  } finally {
    await session.endSession();
  }

  return deleted;
}

export async function deleteReportsByUser(
  auth0UserId: string,
): Promise<number> {
  const session = getMongoClient().startSession();
  let deletedCount = 0;

  try {
    await session.withTransaction(async () => {
      const reports = await getReportCollection()
        .find({ auth0UserId }, { session, projection: { _id: 1 } })
        .toArray();
      const reportIds = reports.map((report) => report._id);

      const result = await getReportCollection().deleteMany(
        { auth0UserId },
        { session },
      );
      deletedCount = result.deletedCount;

      await deleteReportResults(reportIds, session);
    });
  } finally {
    await session.endSession();
  }

  return deletedCount;
}
