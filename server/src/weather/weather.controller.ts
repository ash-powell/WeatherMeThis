import type { Request, Response } from 'express';

import {
  analyzeWeatherRequest,
  planWeatherRequests,
  WeatherUpstreamError,
} from './weather.service.js';

import {
  validateAnalysisPlan,
  validateAnalysisRequest,
} from './weather.validator.js';

export function postWeatherPlan(req: Request, res: Response): void {
  const analyses = validateAnalysisPlan(req.body);

  if (!analyses) {
    res.status(400).json({
      message: 'Invalid weather request plan',
    });

    return;
  }

  res.status(200).json(planWeatherRequests(analyses));
}

export async function postWeatherAnalysis(
  req: Request,
  res: Response,
): Promise<void> {
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
