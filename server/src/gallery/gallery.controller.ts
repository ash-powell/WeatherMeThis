import type { Request, Response } from 'express';

import { ObjectId } from 'mongodb';

import { getAuth0UserId } from '../auth/auth.middleware.js';

import {
  findPublicReportById,
  findLikedReportIds,
  likePublicReport,
  publishOwnedReport,
  searchPublicReports,
  unlikePublicReport,
  unpublishOwnedReport,
} from './gallery.repository.js';

import { validateGalleryQuery, validateReportIds } from './gallery.validator.js';

function optionalUserId(req: Request): string | null {
  return req.auth?.payload.sub ?? null;
}

function readReportId(req: Request<{ reportId: string }>, res: Response): ObjectId | null {
  if (!ObjectId.isValid(req.params.reportId)) {
    res.status(400).json({
      message: 'Invalid report ID',
    });

    return null;
  }

  return new ObjectId(req.params.reportId);
}

export async function listPublicReports(req: Request, res: Response): Promise<void> {
  const response = await searchPublicReports(validateGalleryQuery(req.query), optionalUserId(req));

  res.status(200).json(response);
}

export async function getPublicReport(
  req: Request<{ reportId: string }>,
  res: Response,
): Promise<void> {
  const reportId = readReportId(req, res);

  if (!reportId) {
    return;
  }

  const report = await findPublicReportById(reportId, optionalUserId(req));

  if (!report) {
    res.status(404).json({
      message: 'Public report not found',
    });

    return;
  }

  res.status(200).json(report);
}

export async function getLikedReports(req: Request, res: Response): Promise<void> {
  const reportIds = validateReportIds(req.body);

  if (!reportIds) {
    res.status(400).json({
      message: 'Invalid report IDs',
    });

    return;
  }

  const likedReportIds = await findLikedReportIds(reportIds, getAuth0UserId(req));

  res.status(200).json({
    reportIds: likedReportIds,
  });
}

export async function publishReport(
  req: Request<{ reportId: string }>,
  res: Response,
): Promise<void> {
  const reportId = readReportId(req, res);

  if (!reportId) {
    return;
  }

  const publishedAt = await publishOwnedReport(reportId, getAuth0UserId(req));

  if (!publishedAt) {
    res.status(404).json({
      message: 'Report not found',
    });

    return;
  }

  res.status(200).json({
    isPublic: true,
    publishedAt,
  });
}

export async function unpublishReport(
  req: Request<{ reportId: string }>,
  res: Response,
): Promise<void> {
  const reportId = readReportId(req, res);

  if (!reportId) {
    return;
  }

  const unpublished = await unpublishOwnedReport(reportId, getAuth0UserId(req));

  if (!unpublished) {
    res.status(404).json({
      message: 'Report not found',
    });

    return;
  }

  res.status(204).send();
}

export async function likeReport(req: Request<{ reportId: string }>, res: Response): Promise<void> {
  const reportId = readReportId(req, res);

  if (!reportId) {
    return;
  }

  const result = await likePublicReport(reportId, getAuth0UserId(req));

  if (result === 'not-found') {
    res.status(404).json({
      message: 'Public report not found',
    });

    return;
  }

  res.status(200).json({
    liked: true,
  });
}

export async function unlikeReport(
  req: Request<{ reportId: string }>,
  res: Response,
): Promise<void> {
  const reportId = readReportId(req, res);

  if (!reportId) {
    return;
  }

  await unlikePublicReport(reportId, getAuth0UserId(req));

  res.status(204).send();
}
