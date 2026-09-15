import type { NextFunction, Request, Response } from 'express';

import { auth } from 'express-oauth2-jwt-bearer';

import { environment } from '../config/environment.js';

export const jwtCheck = auth({
  audience: environment.auth0Audience,
  issuerBaseURL: environment.auth0IssuerBaseUrl,
  tokenSigningAlg: 'RS256',
});

export function requireAuth0UserId(req: Request, res: Response, next: NextFunction): void {
  const auth0UserId = req.auth?.payload.sub;

  if (!auth0UserId) {
    res.status(401).json({
      message: 'User not recognized',
    });

    return;
  }

  next();
}

export function getAuth0UserId(req: Request): string {
  const auth0UserId = req.auth?.payload.sub;

  if (!auth0UserId) {
    throw new Error('Authenticated request does not contain a user ID');
  }

  return auth0UserId;
}
