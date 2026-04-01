import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import {
    getMealLogs,
    getMealLogById,
    createMealLog,
    updateMealLog,
    deleteMealLog,
} from '../../controllers/food/mealLog.controller';
import {
    getFoodLogs,
    createFoodLog,
    updateFoodLog,
    deleteFoodLog,
} from '../../controllers/food/foodLog.controller';

const router = Router();

router.get('/',     authenticateToken, getMealLogs    as any);
router.get('/:id',  authenticateToken, getMealLogById as any);
router.post('/',    authenticateToken, createMealLog  as any);
router.patch('/:id',  authenticateToken, updateMealLog as any);
router.delete('/:id', authenticateToken, deleteMealLog as any);

// Nested food-log routes
router.get('/:mealLogId/food-logs',      authenticateToken, getFoodLogs    as any);
router.post('/:mealLogId/food-logs',     authenticateToken, createFoodLog  as any);
router.patch('/:mealLogId/food-logs/:id',  authenticateToken, updateFoodLog as any);
router.delete('/:mealLogId/food-logs/:id', authenticateToken, deleteFoodLog as any);

export default router;
