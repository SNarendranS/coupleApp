import { Router } from 'express';
import { CoupleController } from '../controllers/couple.controller';
import { requireAuth } from '../middleware/auth';
import { requireCouple } from '../middleware/couple';
import { validateBody } from '../middleware/validate';
import { coupleSettingsSchema } from '@couple/shared';

const router = Router();

router.use(requireAuth, requireCouple);

router.get('/', CoupleController.getDetails);
router.patch('/settings', validateBody(coupleSettingsSchema), CoupleController.updateSettings);

export const coupleRoutes = router;
