import { ensureReportIndexes } from './reports/report.repository.js';
import dns from 'node:dns';

import { app } from './app.js';

import { environment } from './config/environment.js';

import { connectToDatabase } from './database/mongodb.js';

import { ensureGalleryIndexes } from './gallery/gallery.repository.js';

async function startServer(): Promise<void> {
  try {
    if (environment.dnsServers.length > 0) {
      dns.setServers(environment.dnsServers);
    }

    await connectToDatabase();
    await ensureGalleryIndexes();
    await ensureReportIndexes();

    app.listen(environment.port, '127.0.0.1', () => {
      console.log(`Server running on http://127.0.0.1:${environment.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

void startServer();
