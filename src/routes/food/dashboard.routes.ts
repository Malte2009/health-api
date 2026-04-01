import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import {
    getDailySummary,
    getWeeklySummary,
    getMonthlySummary,
    getNutritionOverTime,
} from '../../controllers/food/dashboard.controller';

const router = Router();

router.get('/daily',   authenticateToken, getDailySummary      as any);
router.get('/weekly',  authenticateToken, getWeeklySummary     as any);
router.get('/monthly', authenticateToken, getMonthlySummary    as any);
router.get('/nutrition-over-time', authenticateToken, getNutritionOverTime as any);

export default router;
