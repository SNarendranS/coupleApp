import { Router } from 'express';
import { CalendarController } from '../controllers/calendar.controller';
import { requireAuth } from '../middleware/auth';
import { requireCouple } from '../middleware/couple';
import { validateBody } from '../middleware/validate';
import { calendarEventSchema } from '@couple/shared';

const router = Router();

// Worker endpoint: accepts either x-worker-secret or authenticated couple session
router.post(
  '/reminders/process-due',
  (req, res, next) => {
    const secret = req.headers['x-worker-secret'];
    const configured = process.env.WORKER_SECRET || process.env.JWT_SECRET;
    if (secret && configured && secret === configured) {
      return next();
    }
    requireAuth(req, res, () => {
      requireCouple(req, res, next);
    });
  },
  CalendarController.processDueReminders
);

// Couple-authenticated routes
router.use(requireAuth, requireCouple);

router.get('/countdowns', CalendarController.getCountdowns);
router.get('/story', CalendarController.getOurStory);
router.post('/:id/memory', CalendarController.attachMemory);

router.get('/', CalendarController.getEvents);
router.post('/', validateBody(calendarEventSchema), CalendarController.createEvent);
router.patch('/:id', CalendarController.updateEvent);
router.delete('/:id', CalendarController.deleteEvent);

export const calendarRoutes = router;
