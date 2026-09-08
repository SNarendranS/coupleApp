import { Router } from 'express';
import { MemoriesController } from '../controllers/memories.controller';
import { requireAuth } from '../middleware/auth';
import { requireCouple } from '../middleware/couple';
import { validateBody } from '../middleware/validate';
import { memorySchema } from '@couple/shared';

const router = Router();

router.use(requireAuth, requireCouple);

router.get('/', MemoriesController.getMemories);
router.post('/', validateBody(memorySchema), MemoriesController.createMemory);
router.patch('/:id', MemoriesController.updateMemory);
router.delete('/:id', MemoriesController.deleteMemory);

export const memoriesRoutes = router;
