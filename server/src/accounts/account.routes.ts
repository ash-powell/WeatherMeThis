import { Router } from 'express';

import { jwtCheck, requireAuth0UserId } from '../auth/auth.middleware.js';

import { deleteMembership, getAccountProfile, updateAccountProfile } from './account.controller.js';

const accountRouter = Router();

accountRouter.use(jwtCheck, requireAuth0UserId);

accountRouter.get('/me', getAccountProfile);
accountRouter.patch('/me', updateAccountProfile);
accountRouter.delete('/me', deleteMembership);

export default accountRouter;
