import { Router } from 'express';
import { GameController } from '../controllers/game.controller';
import { requireAuth } from '../middleware/auth';
import { requireCouple } from '../middleware/couple';
import { validateBody } from '../middleware/validate';
import { gameMoveSchema, bingoSubmitBoardSchema, gameRestartSchema } from '@couple/shared';

const router = Router();

router.use(requireAuth, requireCouple);

router.get('/active', GameController.getActiveGame);
router.get('/history', GameController.getHistory);
router.post('/start', GameController.startGame);
router.post('/submit-board', validateBody(bingoSubmitBoardSchema), GameController.submitBoard);
router.post('/autofill', GameController.autoFillBoard);
router.post('/move', validateBody(gameMoveSchema), GameController.makeMove);
router.post('/restart', validateBody(gameRestartSchema), GameController.restartGame);
router.post('/end', validateBody(gameRestartSchema), GameController.endGame);

export const gameRoutes = router;
