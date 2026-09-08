import { Router } from 'express';
import { DrawingController } from '../controllers/drawing.controller';
import { requireAuth } from '../middleware/auth';
import { requireCouple } from '../middleware/couple';
import { validateBody } from '../middleware/validate';
import { drawingStrokeSchema } from '@couple/shared';

const router = Router();

router.use(requireAuth, requireCouple);

router.get('/', DrawingController.getBoard);
router.post('/strokes', validateBody(drawingStrokeSchema), DrawingController.commitStroke);
router.post('/clear', DrawingController.clearBoard);
router.post('/background', DrawingController.updateBackground);
router.post('/undo', DrawingController.undoStroke);

export const drawingRoutes = router;
