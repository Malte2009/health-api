import { NextFunction, Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { NUTRIENT_KEYS, NutrientKey } from '../../utility/nutrientFields';

const MEAL_INCLUDE = {
    ingredients: {
        include: { food: { include: { nutrients: true } } }
    }
} as const;

const round = (n: number, dec = 1) => Math.round(n * 10 ** dec) / 10 ** dec;

// Compute aggregated nutrition for a set of ingredients scaled by an optional factor
const computeNutrition = (ingredients: { weight_g: number; food: any }[], scaleFactor = 1) => {
    let calories = 0, protein_g = 0, carbs_g = 0, fat_g = 0, fiber_g = 0;
    const nutrientTotals: Partial<Record<NutrientKey, number>> = {};

    for (const ing of ingredients) {
        const factor = (ing.weight_g * scaleFactor) / 100;
        const f = ing.food;

        calories  += (f.calories_per_100g ?? 0) * factor;
        protein_g += (f.protein_g         ?? 0) * factor;
        carbs_g   += (f.carbs_g           ?? 0) * factor;
        fat_g     += (f.fat_g             ?? 0) * factor;
        fiber_g   += (f.fiber_g           ?? 0) * factor;

        if (f.nutrients) {
            for (const key of NUTRIENT_KEYS) {
                const val = f.nutrients[key];
                if (val != null) {
                    nutrientTotals[key] = (nutrientTotals[key] ?? 0) + Number(val) * factor;
                }
            }
        }
    }

    return {
        calories:  round(calories),
        protein_g: round(protein_g),
        carbs_g:   round(carbs_g),
        fat_g:     round(fat_g),
        fiber_g:   round(fiber_g),
        nutrientTotals: Object.fromEntries(
            Object.entries(nutrientTotals).map(([k, v]) => [k, round(v as number, 2)])
        ),
    };
};

// ── CRUD ────────────────────────────────────────────────────────────────────

export const getMeals = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;

    try {
        const meals = await prisma.meal.findMany({
            where: { userId },
            include: MEAL_INCLUDE,
            orderBy: { createdAt: 'desc' }
        });

        const result = meals.map(m => ({
            ...m,
            nutrition: computeNutrition(m.ingredients as any),
        }));

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

export const getMealById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const id = req.params.id;

    try {
        const meal = await prisma.meal.findUnique({
            where: { id, userId },
            include: MEAL_INCLUDE,
        });

        if (!meal) return res.status(404).send("Meal not found");

        return res.status(200).json({
            ...meal,
            nutrition: computeNutrition(meal.ingredients as any),
        });
    } catch (error) {
        next(error);
    }
}

export const createMeal = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const { name, servingSize, ingredients } = req.body;

    if (!name) return res.status(400).send("name is required");

    try {
        // Validate all foodIds exist if ingredients provided
        if (ingredients?.length) {
            for (const ing of ingredients) {
                if (!ing.foodId || ing.weight_g == null) {
                    return res.status(400).send("Each ingredient requires foodId and weight_g");
                }
                const food = await prisma.food.findUnique({ where: { id: ing.foodId } });
                if (!food) return res.status(404).send(`Food not found: ${ing.foodId}`);
            }
        }

        const meal = await prisma.meal.create({
            include: MEAL_INCLUDE,
            data: {
                userId,
                name,
                servingSize,
                ingredients: ingredients?.length ? {
                    create: ingredients.map((ing: any) => ({
                        foodId:   ing.foodId,
                        weight_g: ing.weight_g,
                    }))
                } : undefined
            }
        });

        return res.status(201).json({
            ...meal,
            nutrition: computeNutrition(meal.ingredients as any),
        });
    } catch (error) {
        next(error);
    }
}

export const updateMeal = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const id = req.params.id;

    try {
        const existing = await prisma.meal.findUnique({ where: { id, userId } });
        if (!existing) return res.status(404).send("Meal not found");

        const meal = await prisma.meal.update({
            where: { id },
            include: MEAL_INCLUDE,
            data: {
                name:        req.body.name,
                servingSize: req.body.servingSize,
            }
        });

        return res.status(200).json({
            ...meal,
            nutrition: computeNutrition(meal.ingredients as any),
        });
    } catch (error) {
        next(error);
    }
}

export const deleteMeal = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const id = req.params.id;

    try {
        const existing = await prisma.meal.findUnique({ where: { id, userId } });
        if (!existing) return res.status(404).send("Meal not found");

        await prisma.meal.delete({ where: { id } });
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
}

// ── INGREDIENTS ──────────────────────────────────────────────────────────────

export const addIngredient = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const mealId = req.params.id;
    const { foodId, weight_g } = req.body;

    if (!foodId || weight_g == null) return res.status(400).send("foodId and weight_g are required");

    try {
        const meal = await prisma.meal.findUnique({ where: { id: mealId, userId } });
        if (!meal) return res.status(404).send("Meal not found");

        const food = await prisma.food.findUnique({ where: { id: foodId } });
        if (!food) return res.status(404).send("Food not found");

        const ingredient = await prisma.mealIngredient.create({
            include: { food: true },
            data: { mealId, foodId, weight_g }
        });

        return res.status(201).json(ingredient);
    } catch (error) {
        next(error);
    }
}

export const updateIngredient = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const { id: mealId, ingredientId } = req.params;

    try {
        const meal = await prisma.meal.findUnique({ where: { id: mealId, userId } });
        if (!meal) return res.status(404).send("Meal not found");

        const existing = await prisma.mealIngredient.findUnique({ where: { id: ingredientId, mealId } });
        if (!existing) return res.status(404).send("Ingredient not found");

        const updated = await prisma.mealIngredient.update({
            where: { id: ingredientId },
            include: { food: true },
            data: { weight_g: req.body.weight_g }
        });

        return res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
}

export const removeIngredient = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const { id: mealId, ingredientId } = req.params;

    try {
        const meal = await prisma.meal.findUnique({ where: { id: mealId, userId } });
        if (!meal) return res.status(404).send("Meal not found");

        const existing = await prisma.mealIngredient.findUnique({ where: { id: ingredientId, mealId } });
        if (!existing) return res.status(404).send("Ingredient not found");

        await prisma.mealIngredient.delete({ where: { id: ingredientId } });
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
}

// ── LOG MEAL ─────────────────────────────────────────────────────────────────

export const logMeal = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const id = req.params.id;
    const { mealLogId, scaleFactor = 1, date } = req.body;

    if (!mealLogId) return res.status(400).send("mealLogId is required");
    if (typeof scaleFactor !== 'number' || scaleFactor <= 0) {
        return res.status(400).send("scaleFactor must be a positive number");
    }

    try {
        const meal = await prisma.meal.findUnique({
            where: { id, userId },
            include: { ingredients: true }
        });
        if (!meal) return res.status(404).send("Meal not found");

        const mealLog = await prisma.mealLog.findUnique({ where: { id: mealLogId, userId } });
        if (!mealLog) return res.status(404).send("Meal log not found");

        const logDate = date ? new Date(date) : new Date();
        if (isNaN(logDate.getTime())) return res.status(400).send("Invalid date format");

        const foodLogs = await prisma.$transaction(
            meal.ingredients.map(ing =>
                prisma.foodLog.create({
                    include: { food: true },
                    data: {
                        userId,
                        mealLogId,
                        foodId:   ing.foodId,
                        weight_g: ing.weight_g * scaleFactor,
                        date:     logDate,
                    }
                })
            )
        );

        return res.status(201).json(foodLogs);
    } catch (error) {
        next(error);
    }
}
