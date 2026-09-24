import express from 'express';

import { postWeatherAnalysis, postWeatherPlan } from './weather.controller.js';

const router = express.Router();

router.post('/plan', postWeatherPlan);
router.post('/', postWeatherAnalysis);

export default router;
