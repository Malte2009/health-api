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

router.get('/',     authenticateToken, getMealLogs   );
router.get('/:id',  authenticateToken, getMealLogById);
router.post('/',    authenticateToken, createMealLog );
router.patch('/:id',  authenticateToken, updateMealLog);
router.delete('/:id', authenticateToken, deleteMealLog);

// Nested food-log routes
router.get('/:mealLogId/food-logs',      authenticateToken, getFoodLogs   );
router.post('/:mealLogId/food-logs',     authenticateToken, createFoodLog );
router.patch('/:mealLogId/food-logs/:id',  authenticateToken, updateFoodLog);
router.delete('/:mealLogId/food-logs/:id', authenticateToken, deleteFoodLog);

export default router;
