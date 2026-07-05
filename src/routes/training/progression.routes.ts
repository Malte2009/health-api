import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { getProgression } from '../../controllers/training/progression.controller';

const router = Router() as any;

router.use(authenticateToken);

router.get('/progression/:exerciseId', getProgression);

export default router;

