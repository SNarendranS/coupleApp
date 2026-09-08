import { Router } from 'express';
import { ActivityController } from '../controllers/activity.controller';
import { requireAuth } from '../middleware/auth';
import { requireCouple } from '../middleware/couple';

const router = Router();

router.use(requireAuth, requireCouple);

router.get('/', ActivityController.getActivities);

export const activityRoutes = router;
