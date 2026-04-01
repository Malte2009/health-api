import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import {
    getFoods,
    getMyFoods,
    searchFoods,
    getFoodById,
    createFood,
    updateFood,
    deleteFood,
} from '../../controllers/food/food.controller';
import {
    getNutrients,
    createNutrients,
    updateNutrients,
    deleteNutrients,
} from '../../controllers/food/nutrient.controller';

const router = Router();

// Order matters: specific paths before /:id
router.get('/search',   authenticateToken, searchFoods  as any);
router.get('/my-foods', authenticateToken, getMyFoods   as any);
router.get('/',         authenticateToken, getFoods      as any);
router.get('/:id',      authenticateToken, getFoodById   as any);
router.post('/',        authenticateToken, createFood    as any);
router.patch('/:id',    authenticateToken, updateFood    as any);
router.delete('/:id',   authenticateToken, deleteFood    as any);

// Nested nutrient routes
router.get('/:foodId/nutrients',    authenticateToken, getNutrients    as any);
router.post('/:foodId/nutrients',   authenticateToken, createNutrients as any);
router.patch('/:foodId/nutrients',  authenticateToken, updateNutrients as any);
router.delete('/:foodId/nutrients', authenticateToken, deleteNutrients as any);

export default router;
