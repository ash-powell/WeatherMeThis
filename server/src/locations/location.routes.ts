import express from 'express';

import { getLocations } from './location.controller.js';

const router = express.Router();

router.get('/', getLocations);

export default router;
