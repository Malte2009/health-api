import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { getNRV, getNRVProgress } from '../../controllers/food/nrv.controller';

const router = Router();

router.get('/',         authenticateToken, getNRV         as any);
router.post('/progress', authenticateToken, getNRVProgress as any);

export default router;
