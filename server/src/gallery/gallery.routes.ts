import { Router } from 'express';

import { jwtCheck, requireAuth0UserId } from '../auth/auth.middleware.js';

import {
  getPublicReport,
  getLikedReports,
  likeReport,
  listPublicReports,
  publishReport,
  unlikeReport,
  unpublishReport,
} from './gallery.controller.js';

const galleryRouter = Router();

galleryRouter.get('/', listPublicReports);
galleryRouter.post('/likes/status', jwtCheck, requireAuth0UserId, getLikedReports);
galleryRouter.get('/:reportId', getPublicReport);

galleryRouter.put('/:reportId/publication', jwtCheck, requireAuth0UserId, publishReport);

galleryRouter.delete('/:reportId/publication', jwtCheck, requireAuth0UserId, unpublishReport);

galleryRouter.post('/:reportId/like', jwtCheck, requireAuth0UserId, likeReport);

galleryRouter.delete('/:reportId/like', jwtCheck, requireAuth0UserId, unlikeReport);

export default galleryRouter;
