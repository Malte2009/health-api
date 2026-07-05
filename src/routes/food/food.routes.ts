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

const router = Router() as any;

// Order matters: specific paths before /:id
router.get('/search',   authenticateToken, searchFoods);
router.get('/my-foods', authenticateToken, getMyFoods);
router.get('/',         authenticateToken, getFoods);
router.get('/:id',      authenticateToken, getFoodById);
router.post('/',        authenticateToken, createFood);
router.patch('/:id',    authenticateToken, updateFood);
router.delete('/:id',   authenticateToken, deleteFood);

// Nested nutrient routes
router.get('/:foodId/nutrients',    authenticateToken, getNutrients);
router.post('/:foodId/nutrients',   authenticateToken, createNutrients);
router.patch('/:foodId/nutrients',  authenticateToken, updateNutrients);
router.delete('/:foodId/nutrients', authenticateToken, deleteNutrients);

export default router;
