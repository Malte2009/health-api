import { NextFunction, Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { PortionUnit } from '@prisma/client';

const isPositiveNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

const resolveWeightInGrams = ({
    food,
    weight_g,
    amount,
    unit,
}: {
    food: { defaultAmount: number | null; defaultUnit: PortionUnit | null; density_g_per_ml: number | null };
    weight_g?: unknown;
    amount?: unknown;
    unit?: unknown;
}): { weight_g?: number; error?: string } => {
    if (weight_g != null) {
        if (!isPositiveNumber(weight_g)) return { error: 'weight_g must be a positive number' };
        return { weight_g };
    }

    if (amount != null || unit != null) {
        if (!isPositiveNumber(amount)) return { error: 'amount must be a positive number when unit is provided' };
        if (unit !== PortionUnit.G && unit !== PortionUnit.ML) return { error: 'unit must be one of: G, ML' };

        if (unit === PortionUnit.G) return { weight_g: amount };

        if (!isPositiveNumber(food.density_g_per_ml)) {
            return { error: 'Food density_g_per_ml is required to convert ML to grams' };
        }

        return { weight_g: amount * food.density_g_per_ml };
    }

    if (food.defaultAmount == null || food.defaultUnit == null) {
        return { error: 'weight_g is required when food has no default portion' };
    }

    if (food.defaultUnit === PortionUnit.G) {
        return { weight_g: food.defaultAmount };
    }

    if (!isPositiveNumber(food.density_g_per_ml)) {
        return { error: 'Food density_g_per_ml is required when defaultUnit is ML' };
    }

    return { weight_g: food.defaultAmount * food.density_g_per_ml };
};

export const getFoodLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const mealLogId = req.params.mealLogId;

    try {
        const mealLog = await prisma.mealLog.findUnique({ where: { id: mealLogId, userId } });
        if (!mealLog) return res.status(404).send("Meal log not found");

        const foodLogs = await prisma.foodLog.findMany({
            where: { mealLogId },
            include: { food: true },
            orderBy: { createdAt: 'asc' }
        });

        return res.status(200).json(foodLogs);
    } catch (error) {
        next(error);
    }
}

export const createFoodLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const mealLogId = req.params.mealLogId;
    const { foodId, weight_g, amount, unit, date } = req.body;

    if (!foodId) return res.status(400).send("foodId is required");

    try {
        const mealLog = await prisma.mealLog.findUnique({ where: { id: mealLogId, userId } });
        if (!mealLog) return res.status(404).send("Meal log not found");

        const food = await prisma.food.findUnique({
            where: { id: foodId, userId },
            select: { id: true, defaultAmount: true, defaultUnit: true, density_g_per_ml: true }
        });
        if (!food) return res.status(404).send("Food not found");

        const resolvedWeight = resolveWeightInGrams({ food, weight_g, amount, unit });
        if (resolvedWeight.error) return res.status(400).send(resolvedWeight.error);

        const logDate = date ? new Date(date) : new Date();
        if (isNaN(logDate.getTime())) return res.status(400).send("Invalid date format");

        const foodLog = await prisma.foodLog.create({
            include: { food: true },
            data: {
                userId,
                mealLogId,
                foodId,
                weight_g: resolvedWeight.weight_g,
                date: logDate,
            }
        });

        return res.status(201).json(foodLog);
    } catch (error) {
        next(error);
    }
}

export const updateFoodLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const { mealLogId, id } = req.params;

    try {
        const existing = await prisma.foodLog.findUnique({ where: { id, mealLogId, userId } });
        if (!existing) return res.status(404).send("Food log not found");

        const data: any = {};

        if (req.body.weight_g != null || req.body.amount != null || req.body.unit != null) {
            const food = await prisma.food.findUnique({
                where: { id: existing.foodId, userId },
                select: { id: true, defaultAmount: true, defaultUnit: true, density_g_per_ml: true }
            });
            if (!food) return res.status(404).send('Food not found');

            const resolvedWeight = resolveWeightInGrams({
                food,
                weight_g: req.body.weight_g,
                amount: req.body.amount,
                unit: req.body.unit,
            });
            if (resolvedWeight.error) return res.status(400).send(resolvedWeight.error);
            data.weight_g = resolvedWeight.weight_g;
        }

        if (req.body.date != null) {
            const d = new Date(req.body.date);
            if (isNaN(d.getTime())) return res.status(400).send("Invalid date format");
            data.date = d;
        }

        const updated = await prisma.foodLog.update({
            where: { id },
            include: { food: true },
            data
        });

        return res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
}

export const deleteFoodLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const { mealLogId, id } = req.params;

    try {
        const existing = await prisma.foodLog.findUnique({ where: { id, mealLogId, userId } });
        if (!existing) return res.status(404).send("Food log not found");

        await prisma.foodLog.delete({ where: { id } });
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
}
