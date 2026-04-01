import { NextFunction, Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

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
    const { foodId, weight_g, date } = req.body;

    if (!foodId) return res.status(400).send("foodId is required");

    try {
        const mealLog = await prisma.mealLog.findUnique({ where: { id: mealLogId, userId } });
        if (!mealLog) return res.status(404).send("Meal log not found");

        const food = await prisma.food.findUnique({ where: { id: foodId } });
        if (!food) return res.status(404).send("Food not found");

        const logDate = date ? new Date(date) : new Date();
        if (isNaN(logDate.getTime())) return res.status(400).send("Invalid date format");

        const foodLog = await prisma.foodLog.create({
            include: { food: true },
            data: {
                userId,
                mealLogId,
                foodId,
                weight_g,
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
        if (req.body.weight_g != null) data.weight_g = req.body.weight_g;
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
