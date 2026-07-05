import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import {
    getGoals,
    createGoals,
    updateGoals,
    deleteGoals,
} from '../../controllers/food/goals.controller';

const router = Router() as any;

router.get('/',    authenticateToken, getGoals   );
router.post('/',   authenticateToken, createGoals);
router.patch('/',  authenticateToken, updateGoals);
router.delete('/', authenticateToken, deleteGoals);

export default router;
