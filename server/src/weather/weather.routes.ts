import express from 'express';

import { postWeatherAnalysis } from './weather.controller.js';

const router = express.Router();

router.post('/', postWeatherAnalysis);

export default router;
