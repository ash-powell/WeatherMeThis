// Run from server/: node dist/reports/check-story-names.js
// Read-only by default. --create-index also creates the uniqueness index.
import dns from 'node:dns';
import { environment } from '../config/environment.js';
import { connectToDatabase, closeDatabaseConnection } from '../database/mongodb.js';
import { ensureReportIndexes } from './report.repository.js';

async function main(): Promise<void> {
  try {
    if (environment.dnsServers.length) dns.setServers(environment.dnsServers);
    const db = await connectToDatabase();
    const duplicates = await db
      .collection('savedReports')
      .aggregate(
        [
          {
            $group: {
              _id: { owner: '$auth0UserId', name: '$name' },
              ids: { $push: '$_id' },
              count: { $sum: 1 },
            },
          },
          { $match: { count: { $gt: 1 } } },
        ],
        { collation: { locale: 'en', strength: 2 } },
      )
      .toArray();
    if (duplicates.length) {
      console.error(
        'Duplicate story names found. Rename these through the existing app before deploying. No stories were changed.',
      );
      for (const group of duplicates) {
        console.error(JSON.stringify({ name: group._id.name, storyIds: group.ids }));
      }
      process.exitCode = 1;
      return;
    }
    console.log('No duplicate story names found.');
    if (process.argv.includes('--create-index')) {
      await ensureReportIndexes();
      console.log('Unique story-name index is ready.');
    }
  } catch (error) {
    console.error('Story-name check failed:', error);
    process.exitCode = 1;
  } finally {
    await closeDatabaseConnection();
  }
}

void main();
