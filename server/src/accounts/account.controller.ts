import type { Request, Response } from 'express';

import { getAuth0UserId } from '../auth/auth.middleware.js';

import {
  deleteMembership as deleteAccountMembership,
  getAccountProfile as getProfile,
  updateAccountDisplayName,
} from './account.service.js';

import { validateDisplayName, validatesDeleteConfirmation } from './account.validator.js';

export async function getAccountProfile(req: Request, res: Response): Promise<void> {
  const profile = await getProfile(getAuth0UserId(req));

  res.status(200).json(profile);
}

export async function updateAccountProfile(req: Request, res: Response): Promise<void> {
  const displayName = validateDisplayName(req.body);

  if (!displayName) {
    res.status(400).json({
      message: 'Display name must contain 1 through 100 characters',
    });

    return;
  }

  const profile = await updateAccountDisplayName(getAuth0UserId(req), displayName);

  res.status(200).json(profile);
}

export async function deleteMembership(req: Request, res: Response): Promise<void> {
  if (!validatesDeleteConfirmation(req.body)) {
    res.status(400).json({
      message: 'Membership deletion was not confirmed',
    });

    return;
  }

  try {
    await deleteAccountMembership(getAuth0UserId(req));

    res.status(204).send();
  } catch (error) {
    console.error('Membership deletion failed:', error);

    res.status(502).json({
      message: 'Unable to complete membership deletion',
    });
  }
}
