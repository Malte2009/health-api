import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import {
    getMeals,
    getMealById,
    createMeal,
    updateMeal,
    deleteMeal,
    addIngredient,
    updateIngredient,
    removeIngredient,
    logMeal,
} from '../../controllers/food/meal.controller';

const router = Router();

router.get('/',    authenticateToken, getMeals    as any);
router.get('/:id', authenticateToken, getMealById as any);
router.post('/',   authenticateToken, createMeal  as any);
router.patch('/:id',  authenticateToken, updateMeal as any);
router.delete('/:id', authenticateToken, deleteMeal as any);

// Ingredients
router.post('/:id/ingredients',                  authenticateToken, addIngredient    as any);
router.patch('/:id/ingredients/:ingredientId',   authenticateToken, updateIngredient as any);
router.delete('/:id/ingredients/:ingredientId',  authenticateToken, removeIngredient as any);

// Log whole meal into a MealLog
router.post('/:id/log', authenticateToken, logMeal as any);

export default router;
