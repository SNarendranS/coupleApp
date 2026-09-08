import { Router } from 'express';
import { GameController } from '../controllers/game.controller';
import { requireAuth } from '../middleware/auth';
import { requireCouple } from '../middleware/couple';
import { validateBody } from '../middleware/validate';
import { gameMoveSchema } from '@couple/shared';

const router = Router();

router.use(requireAuth, requireCouple);

router.get('/active', GameController.getActiveGame);
router.get('/history', GameController.getHistory);
router.post('/start', GameController.startGame);
router.post('/move', validateBody(gameMoveSchema), GameController.makeMove);

export const gameRoutes = router;
