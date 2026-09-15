import { deleteGalleryDataForUser } from '../gallery/gallery.repository.js';

import { deleteAccountProfile, findAccountProfile, saveDisplayName } from './account.repository.js';

import { deleteAuth0User, prepareAuth0UserDeletion } from './auth0-management.service.js';

export async function getAccountProfile(auth0UserId: string) {
  return findAccountProfile(auth0UserId);
}

export async function updateAccountDisplayName(auth0UserId: string, displayName: string) {
  return saveDisplayName(auth0UserId, displayName);
}

export async function deleteMembership(auth0UserId: string): Promise<void> {
  // Obtain a valid Management API token before deleting
  // application data. The remaining operations are
  // intentionally idempotent so a failed request can retry.
  const accessToken = await prepareAuth0UserDeletion();

  await Promise.all([deleteGalleryDataForUser(auth0UserId), deleteAccountProfile(auth0UserId)]);

  await deleteAuth0User(auth0UserId, accessToken);
}
