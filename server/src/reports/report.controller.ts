import type { Request, Response } from 'express';

import { ObjectId } from 'mongodb';

import { getAuth0UserId } from '../auth/auth.middleware.js';

import {
  createReport as createReportDocument,
  deleteReportById,
  findReportById,
  findReportsByUser,
  updateReportById,
} from './report.repository.js';

import { validateReportRequest } from './report.validator.js';

export async function createReport(req: Request, res: Response): Promise<void> {
  const reportRequest = validateReportRequest(req.body);

  if (!reportRequest) {
    res.status(400).json({
      message: 'Invalid report data',
    });

    return;
  }

  const insertedId = await createReportDocument(
    reportRequest,
    getAuth0UserId(req),
  );

  res.status(201).json({
    message: 'Report saved',
    insertedId,
  });
}

export async function getReports(req: Request, res: Response): Promise<void> {
  const reports = await findReportsByUser(getAuth0UserId(req));

  res.status(200).json(reports);
}

export async function getReport(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.status(400).json({ message: 'Invalid report ID' });
    return;
  }

  const report = await findReportById(new ObjectId(id), getAuth0UserId(req));

  if (!report) {
    res.status(404).json({ message: 'Report not found' });
    return;
  }

  res.status(200).json(report);
}

export async function updateReport(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.status(400).json({
      message: 'Invalid report ID',
    });

    return;
  }

  const reportRequest = validateReportRequest(req.body);

  if (!reportRequest) {
    res.status(400).json({
      message: 'Invalid report data',
    });

    return;
  }

  const matched = await updateReportById(
    new ObjectId(id),
    getAuth0UserId(req),
    reportRequest,
  );

  if (!matched) {
    res.status(404).json({
      message: 'Report not found',
    });

    return;
  }

  res.status(200).json({
    message: 'Report updated',
  });
}

export async function deleteReport(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.status(400).json({
      message: 'Invalid report ID',
    });

    return;
  }

  const deleted = await deleteReportById(new ObjectId(id), getAuth0UserId(req));

  if (!deleted) {
    res.status(404).json({
      message: 'Report not found. No deletion performed.',
    });

    return;
  }

  res.status(200).json({
    message: 'Report deleted',
  });
}
