import { ObjectId } from 'mongodb';

import { getDatabase, getMongoClient } from '../database/mongodb.js';

import { buildSearchFacets } from '../gallery/gallery.repository.js';

import type { ReportRequest, SavedReport } from './report.models.js';

function getReportCollection() {
  return getDatabase().collection<SavedReport>('savedReports');
}

export async function ensureReportIndexes(): Promise<void> {
  await getReportCollection().createIndex(
    { auth0UserId: 1, name: 1 },
    {
      name: 'unique_story_name_per_user',
      unique: true,
      collation: { locale: 'en', strength: 2 },
    },
  );
}

export async function createReport(report: ReportRequest, auth0UserId: string): Promise<ObjectId> {
  const savedReport: SavedReport = {
    ...report,
    auth0UserId,
    createdAt: new Date(),
    isPublic: false,
    publishedAt: null,
    likeCount: 0,
    searchFacets: [],
  };

  const result = await getReportCollection().insertOne(savedReport);

  return result.insertedId;
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
        },
      },
    )
    .sort({
      createdAt: -1,
    })
    .toArray();
}

export async function updateReportById(
  reportId: ObjectId,
  auth0UserId: string,
  report: ReportRequest,
): Promise<boolean> {
  const result = await getReportCollection().updateOne(
    {
      _id: reportId,
      auth0UserId,
    },
    {
      $set: {
        ...report,
        searchFacets: buildSearchFacets(report),
      },
    },
  );

  return result.matchedCount > 0;
}

export async function deleteReportById(reportId: ObjectId, auth0UserId: string): Promise<boolean> {
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

export async function deleteReportsByUser(auth0UserId: string): Promise<number> {
  const result = await getReportCollection().deleteMany({
    auth0UserId,
  });

  return result.deletedCount;
}
