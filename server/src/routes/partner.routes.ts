import { Router } from 'express';
import { PartnerController } from '../controllers/partner.controller';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { partnerRequestSchema } from '@couple/shared';

const router = Router();

router.use(requireAuth);

router.get('/search', PartnerController.search);
router.post('/requests', validateBody(partnerRequestSchema), PartnerController.sendRequest);
router.get('/requests', PartnerController.getRequests);
router.post('/requests/:id/accept', PartnerController.acceptRequest);
router.post('/requests/:id/reject', PartnerController.rejectRequest);
router.delete('/requests/:id', PartnerController.cancelRequest);

export const partnerRoutes = router;
