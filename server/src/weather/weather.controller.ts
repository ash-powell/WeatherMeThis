import type { Request, Response } from 'express';

import { analyzeWeatherRequest, WeatherUpstreamError } from './weather.service.js';

import { validateAnalysisRequest } from './weather.validator.js';

export async function postWeatherAnalysis(req: Request, res: Response): Promise<void> {
  const analysis = validateAnalysisRequest(req.body);

  if (!analysis) {
    res.status(400).json({
      message: 'Invalid analysis data',
    });

    return;
  }

  try {
    const result = await analyzeWeatherRequest(analysis);

    res.json(result);
  } catch (error) {
    console.error('Weather request failed:', error);

    if (error instanceof WeatherUpstreamError) {
      res.status(error.status).json({
        error: error.publicMessage,
      });

      return;
    }

    res.status(500).json({
      error: 'Unable to retrieve weather data',
    });
  }
}
