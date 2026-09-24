import { MongoServerError } from 'mongodb';
import express from 'express';
import cors from 'cors';

import { environment } from './config/environment.js';

import locationRouter from './locations/location.routes.js';
import reportRouter from './reports/report.routes.js';
import weatherRouter from './weather/weather.routes.js';
import accountRouter from './accounts/account.routes.js';
import galleryRouter from './gallery/gallery.routes.js';

export function createApp(): express.Express {
  const app = express();

  app.use(
    cors({
      origin: environment.clientOrigin,
    }),
  );

  // Exact-date chart results can make saved-story payloads substantially larger
  // than ordinary API requests. Keep the larger limit scoped to report routes.
  app.use('/api/reports', express.json({ limit: '25mb' }), reportRouter);

  app.use(express.json());

  app.get('/', (_req, res) => {
    res.send('WeatherMeThis API is running');
  });

  app.use('/api/locations', locationRouter);
  app.use('/api/account', accountRouter);
  app.use('/api/gallery', galleryRouter);
  app.use('/api/weather', weatherRouter);

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (
        error instanceof MongoServerError &&
        error.code === 11000 &&
        error.message.includes('unique_story_name_per_user')
      ) {
        res
          .status(409)
          .json({ message: 'You already have a saved story with this name.' });
        return;
      }
      next(error);
    },
  );

  return app;
}

export const app = createApp();
