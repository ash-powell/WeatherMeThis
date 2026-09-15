import { getDatabase } from '../database/mongodb.js';

import type { AccountDocument, AccountProfile } from './account.models.js';

function getAccountCollection() {
  return getDatabase().collection<AccountDocument>('accounts');
}

export async function findAccountProfile(auth0UserId: string): Promise<AccountProfile> {
  const account = await getAccountCollection().findOne(
    {
      auth0UserId,
    },
    {
      projection: {
        _id: 0,
        displayName: 1,
      },
    },
  );

  return {
    displayName: account?.displayName ?? null,
  };
}

export async function saveDisplayName(
  auth0UserId: string,
  displayName: string,
): Promise<AccountProfile> {
  const now = new Date();

  await getAccountCollection().updateOne(
    {
      auth0UserId,
    },
    {
      $set: {
        displayName,
        updatedAt: now,
      },
      $setOnInsert: {
        auth0UserId,
        createdAt: now,
      },
    },
    {
      upsert: true,
    },
  );

  return {
    displayName,
  };
}

export async function deleteAccountProfile(auth0UserId: string): Promise<void> {
  await getAccountCollection().deleteOne({
    auth0UserId,
  });
}
