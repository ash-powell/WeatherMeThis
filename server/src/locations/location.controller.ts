import type { Request, Response } from 'express';

import { searchLocations } from './location.service.js';

export async function getLocations(req: Request, res: Response): Promise<void> {
  const city = req.query.city;

  if (typeof city !== 'string' || city.trim().length === 0) {
    res.status(400).json({
      error: 'City is required',
    });

    return;
  }

  try {
    const locations = await searchLocations(city.trim());

    res.json(locations);
  } catch (error) {
    console.error('Location request failed:', error);

    res.status(502).json({
      error: 'Unable to retrieve locations',
    });
  }
}
