import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import {
    getGoals,
    createGoals,
    updateGoals,
    deleteGoals,
} from '../../controllers/food/goals.controller';

const router = Router();

router.get('/',    authenticateToken, getGoals    as any);
router.post('/',   authenticateToken, createGoals as any);
router.patch('/',  authenticateToken, updateGoals as any);
router.delete('/', authenticateToken, deleteGoals as any);

export default router;
