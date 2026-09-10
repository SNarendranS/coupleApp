import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { partnerRoutes } from './partner.routes';
import { coupleRoutes } from './couple.routes';
import { drawingRoutes } from './drawing.routes';
import { gameRoutes } from './game.routes';
import { calendarRoutes } from './calendar.routes';
import { linksRoutes } from './links.routes';
import { memoriesRoutes } from './memories.routes';
import { notificationRoutes } from './notifications.routes';
import { activityRoutes } from './activity.routes';
import { uploadRoutes } from './upload.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/partner', partnerRoutes);
apiRouter.use('/couple', coupleRoutes);
apiRouter.use('/drawing', drawingRoutes);
apiRouter.use('/games', gameRoutes);
apiRouter.use('/calendar', calendarRoutes);
apiRouter.use('/links', linksRoutes);
apiRouter.use('/memories', memoriesRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/activity', activityRoutes);
apiRouter.use('/upload', uploadRoutes);

export { apiRouter };
