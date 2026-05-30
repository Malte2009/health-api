import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import {
    getDailySummary,
    getWeeklySummary,
    getMonthlySummary,
    getNutritionOverTime,
    getTopFoods,
} from '../../controllers/food/dashboard.controller';

const router = Router();

router.get('/top-foods', authenticateToken, getTopFoods);
router.get('/daily',   authenticateToken, getDailySummary     );
router.get('/weekly',  authenticateToken, getWeeklySummary    );
router.get('/monthly', authenticateToken, getMonthlySummary   );
router.get('/nutrition-over-time', authenticateToken, getNutritionOverTime);

export default router;
