import { Router } from 'express';
import { CalendarController } from '../controllers/calendar.controller';
import { requireAuth } from '../middleware/auth';
import { requireCouple } from '../middleware/couple';
import { validateBody } from '../middleware/validate';
import { calendarEventSchema } from '@couple/shared';

const router = Router();

router.use(requireAuth, requireCouple);

router.get('/', CalendarController.getEvents);
router.post('/', validateBody(calendarEventSchema), CalendarController.createEvent);
router.patch('/:id', CalendarController.updateEvent);
router.delete('/:id', CalendarController.deleteEvent);

export const calendarRoutes = router;
