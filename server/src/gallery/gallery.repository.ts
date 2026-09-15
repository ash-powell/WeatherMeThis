import { ObjectId } from 'mongodb';

import type { Document, Filter, Sort } from 'mongodb';

import { getDatabase, getMongoClient } from '../database/mongodb.js';

import type { SavedReport, ReportSearchFacet } from '../reports/report.models.js';

import type {
  GalleryQuery,
  GalleryReportSummary,
  GallerySearchResponse,
  PublicGalleryReport,
} from './gallery.models.js';

interface ReportLike {
  reportId: ObjectId;
  auth0UserId: string;
  createdAt: Date;
}

function reportCollection() {
  return getDatabase().collection<SavedReport>('savedReports');
}

function likeCollection() {
  return getDatabase().collection<ReportLike>('reportLikes');
}

function normalizeCity(city: string): string {
  return city.trim().toLocaleLowerCase('en-US');
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildSearchFacets(report: Pick<SavedReport, 'charts'>): ReportSearchFacet[] {
  const uniqueFacets = new Map<string, ReportSearchFacet>();

  for (const chart of report.charts) {
    for (const series of chart.seriesArray) {
      const city = series.location.city.trim();
      const cityNormalized = normalizeCity(city);
      const key = `${cityNormalized}\u0000${series.measurement}`;

      uniqueFacets.set(key, {
        city,
        cityNormalized,
        measurement: series.measurement,
      });
    }
  }

  return [...uniqueFacets.values()];
}

export async function ensureGalleryIndexes(): Promise<void> {
  await Promise.all([
    reportCollection().createIndex({
      isPublic: 1,
      publishedAt: -1,
    }),
    reportCollection().createIndex({
      isPublic: 1,
      likeCount: -1,
      publishedAt: -1,
    }),
    reportCollection().createIndex({
      isPublic: 1,
      'searchFacets.cityNormalized': 1,
      'searchFacets.measurement': 1,
    }),
    likeCollection().createIndex(
      {
        reportId: 1,
        auth0UserId: 1,
      },
      {
        unique: true,
      },
    ),
    likeCollection().createIndex({
      auth0UserId: 1,
    }),
    getDatabase().collection('accounts').createIndex(
      {
        auth0UserId: 1,
      },
      {
        unique: true,
      },
    ),
  ]);
}

export async function publishOwnedReport(
  reportId: ObjectId,
  auth0UserId: string,
): Promise<Date | null> {
  const report = await reportCollection().findOne({
    _id: reportId,
    auth0UserId,
  });

  if (!report) {
    return null;
  }

  const publishedAt = new Date();

  const result = await reportCollection().updateOne(
    {
      _id: reportId,
      auth0UserId,
    },
    {
      $set: {
        isPublic: true,
        publishedAt,
        likeCount: report.likeCount ?? 0,
        searchFacets: buildSearchFacets(report),
      },
    },
  );

  return result.matchedCount > 0 ? publishedAt : null;
}

export async function unpublishOwnedReport(
  reportId: ObjectId,
  auth0UserId: string,
): Promise<boolean> {
  const result = await reportCollection().updateOne(
    {
      _id: reportId,
      auth0UserId,
    },
    {
      $set: {
        isPublic: false,
        publishedAt: null,
      },
    },
  );

  return result.matchedCount > 0;
}

function buildGalleryFilter(query: GalleryQuery): Filter<SavedReport> {
  const filter: Filter<SavedReport> = {
    isPublic: true,
    publishedAt: {
      $ne: null,
    },
  };

  if (query.city || query.measurement) {
    const facetFilter: Document = {};

    if (query.city) {
      facetFilter['cityNormalized'] = normalizeCity(query.city);
    }

    if (query.measurement) {
      facetFilter['measurement'] = query.measurement;
    }

    filter.searchFacets = {
      $elemMatch: facetFilter,
    };
  }

  if (query.name) {
    filter.name = {
      $regex: escapeRegularExpression(query.name),
      $options: 'i',
    };
  }

  return filter;
}

function buildGallerySort(query: GalleryQuery): Sort {
  switch (query.sort) {
    case 'oldest':
      return {
        publishedAt: 1,
        _id: 1,
      };

    case 'popular':
      return {
        likeCount: -1,
        publishedAt: -1,
        _id: -1,
      };

    case 'newest':
      return {
        publishedAt: -1,
        _id: -1,
      };
  }
}

function authorLookupStages(): Document[] {
  return [
    {
      $lookup: {
        from: 'accounts',
        localField: 'auth0UserId',
        foreignField: 'auth0UserId',
        as: 'authorAccount',
      },
    },
    {
      $set: {
        authorDisplayName: {
          $ifNull: [
            {
              $first: '$authorAccount.displayName',
            },
            'WeatherMeThis member',
          ],
        },
        likeCount: {
          $ifNull: ['$likeCount', 0],
        },
      },
    },
  ];
}

function viewerLikeStages(auth0UserId: string | null): Document[] {
  if (!auth0UserId) {
    return [
      {
        $set: {
          likedByCurrentUser: false,
        },
      },
    ];
  }

  return [
    {
      $lookup: {
        from: 'reportLikes',
        let: {
          currentReportId: '$_id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$reportId', '$$currentReportId'],
                  },
                  {
                    $eq: ['$auth0UserId', auth0UserId],
                  },
                ],
              },
            },
          },
          {
            $limit: 1,
          },
        ],
        as: 'viewerLikes',
      },
    },
    {
      $set: {
        likedByCurrentUser: {
          $gt: [
            {
              $size: '$viewerLikes',
            },
            0,
          ],
        },
      },
    },
  ];
}

export async function searchPublicReports(
  query: GalleryQuery,
  auth0UserId: string | null,
): Promise<GallerySearchResponse> {
  const filter = buildGalleryFilter(query);
  const total = await reportCollection().countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, totalPages);

  const reports = await reportCollection()
    .aggregate<GalleryReportSummary>([
      {
        $match: filter,
      },
      {
        $sort: buildGallerySort(query),
      },
      {
        $skip: (page - 1) * query.pageSize,
      },
      {
        $limit: query.pageSize,
      },
      ...authorLookupStages(),
      ...viewerLikeStages(auth0UserId),
      {
        $set: {
          cities: {
            $setUnion: ['$searchFacets.city', []],
          },
          measurements: {
            $setUnion: ['$searchFacets.measurement', []],
          },
          chartCount: {
            $size: '$charts',
          },
        },
      },
      {
        $project: {
          name: 1,
          authorDisplayName: 1,
          publishedAt: 1,
          likeCount: 1,
          likedByCurrentUser: 1,
          cities: 1,
          measurements: 1,
          chartCount: 1,
        },
      },
    ])
    .toArray();

  return {
    reports,
    page,
    pageSize: query.pageSize,
    total,
    totalPages,
  };
}

export async function findPublicReportById(
  reportId: ObjectId,
  auth0UserId: string | null,
): Promise<PublicGalleryReport | null> {
  const reports = await reportCollection()
    .aggregate<PublicGalleryReport>([
      {
        $match: {
          _id: reportId,
          isPublic: true,
          publishedAt: {
            $ne: null,
          },
        },
      },
      ...authorLookupStages(),
      ...viewerLikeStages(auth0UserId),
      {
        $project: {
          name: 1,
          charts: 1,
          authorDisplayName: 1,
          publishedAt: 1,
          likeCount: 1,
          likedByCurrentUser: 1,
        },
      },
    ])
    .next();

  return reports;
}

export async function findLikedReportIds(
  reportIds: ObjectId[],
  auth0UserId: string,
): Promise<string[]> {
  const likes = await likeCollection()
    .find(
      {
        reportId: {
          $in: reportIds,
        },
        auth0UserId,
      },
      {
        projection: {
          reportId: 1,
        },
      },
    )
    .toArray();

  return likes.map((like) => like.reportId.toHexString());
}

export async function likePublicReport(
  reportId: ObjectId,
  auth0UserId: string,
): Promise<'liked' | 'already-liked' | 'not-found'> {
  const client = getMongoClient();
  const session = client.startSession();
  let outcome: 'liked' | 'already-liked' | 'not-found' = 'not-found';

  try {
    await session.withTransaction(async () => {
      const report = await reportCollection().findOne(
        {
          _id: reportId,
          isPublic: true,
        },
        {
          session,
          projection: {
            _id: 1,
          },
        },
      );

      if (!report) {
        outcome = 'not-found';
        return;
      }

      const existing = await likeCollection().findOne(
        {
          reportId,
          auth0UserId,
        },
        {
          session,
          projection: {
            _id: 1,
          },
        },
      );

      if (existing) {
        outcome = 'already-liked';
        return;
      }

      await likeCollection().insertOne(
        {
          reportId,
          auth0UserId,
          createdAt: new Date(),
        },
        {
          session,
        },
      );

      await reportCollection().updateOne(
        {
          _id: reportId,
        },
        {
          $inc: {
            likeCount: 1,
          },
        },
        {
          session,
        },
      );

      outcome = 'liked';
    });
  } finally {
    await session.endSession();
  }

  return outcome;
}

export async function unlikePublicReport(
  reportId: ObjectId,
  auth0UserId: string,
): Promise<boolean> {
  const client = getMongoClient();
  const session = client.startSession();
  let removed = false;

  try {
    await session.withTransaction(async () => {
      const result = await likeCollection().deleteOne(
        {
          reportId,
          auth0UserId,
        },
        {
          session,
        },
      );

      removed = result.deletedCount > 0;

      if (removed) {
        await reportCollection().updateOne(
          {
            _id: reportId,
            likeCount: {
              $gt: 0,
            },
          },
          {
            $inc: {
              likeCount: -1,
            },
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

  return removed;
}

export async function deleteGalleryDataForUser(auth0UserId: string): Promise<void> {
  const client = getMongoClient();
  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      const ownedReports = await reportCollection()
        .find(
          {
            auth0UserId,
          },
          {
            session,
            projection: {
              _id: 1,
            },
          },
        )
        .toArray();

      const ownedReportIds = ownedReports.map((report) => report._id);

      const outgoingLikes = await likeCollection()
        .find(
          {
            auth0UserId,
            reportId: {
              $nin: ownedReportIds,
            },
          },
          {
            session,
            projection: {
              reportId: 1,
            },
          },
        )
        .toArray();

      if (outgoingLikes.length > 0) {
        await reportCollection().bulkWrite(
          outgoingLikes.map((like) => ({
            updateOne: {
              filter: {
                _id: like.reportId,
                likeCount: {
                  $gt: 0,
                },
              },
              update: {
                $inc: {
                  likeCount: -1,
                },
              },
            },
          })),
          {
            session,
          },
        );
      }

      await likeCollection().deleteMany(
        {
          $or: [
            {
              auth0UserId,
            },
            {
              reportId: {
                $in: ownedReportIds,
              },
            },
          ],
        },
        {
          session,
        },
      );

      await reportCollection().deleteMany(
        {
          auth0UserId,
        },
        {
          session,
        },
      );
    });
  } finally {
    await session.endSession();
  }
}
