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

const router = Router() as any;

router.get('/',    authenticateToken, getMeals   );
router.get('/:id', authenticateToken, getMealById);
router.post('/',   authenticateToken, createMeal );
router.patch('/:id',  authenticateToken, updateMeal);
router.delete('/:id', authenticateToken, deleteMeal);

// Ingredients
router.post('/:id/ingredients',                  authenticateToken, addIngredient   );
router.patch('/:id/ingredients/:ingredientId',   authenticateToken, updateIngredient);
router.delete('/:id/ingredients/:ingredientId',  authenticateToken, removeIngredient);

// Log whole meal into a MealLog
router.post('/:id/log', authenticateToken, logMeal);

export default router;
