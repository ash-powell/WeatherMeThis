import express from 'express';

import { jwtCheck, requireAuth0UserId } from '../auth/auth.middleware.js';

import { createReport, deleteReport, getReports, updateReport } from './report.controller.js';

const router = express.Router();

router.use(jwtCheck, requireAuth0UserId);

router.post('/', createReport);
router.get('/', getReports);
router.put('/:id', updateReport);
router.delete('/:id', deleteReport);

export default router;
