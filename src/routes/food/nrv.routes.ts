import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { getNRV, getNRVProgress } from '../../controllers/food/nrv.controller';

const router = Router() as any;

router.get('/',         authenticateToken, getNRV        );
router.post('/progress', authenticateToken, getNRVProgress);

export default router;
