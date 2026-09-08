import { Router } from 'express';
import { LinksController } from '../controllers/links.controller';
import { requireAuth } from '../middleware/auth';
import { requireCouple } from '../middleware/couple';
import { validateBody } from '../middleware/validate';
import { sharedLinkSchema } from '@couple/shared';

const router = Router();

router.use(requireAuth, requireCouple);

router.get('/', LinksController.getLinks);
router.post('/', validateBody(sharedLinkSchema), LinksController.createLink);
router.patch('/:id', LinksController.updateLink);
router.delete('/:id', LinksController.deleteLink);

export const linksRoutes = router;
