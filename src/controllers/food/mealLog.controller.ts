import { NextFunction, Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { MealType } from '@prisma/client';

const VALID_MEAL_TYPES = Object.values(MealType);

export const getMealLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const { date, startDate, endDate } = req.query;

    const where: any = { userId };

    if (date) {
        const d = new Date(date as string);
        if (isNaN(d.getTime())) return res.status(400).send("Invalid date format");
        const start = new Date(d); start.setHours(0, 0, 0, 0);
        const end   = new Date(d); end.setHours(23, 59, 59, 999);
        where.createdAt = { gte: start, lte: end };
    } else if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
            const s = new Date(startDate as string);
            if (isNaN(s.getTime())) return res.status(400).send("Invalid startDate format");
            s.setHours(0, 0, 0, 0);
            where.createdAt.gte = s;
        }
        if (endDate) {
            const e = new Date(endDate as string);
            if (isNaN(e.getTime())) return res.status(400).send("Invalid endDate format");
            e.setHours(23, 59, 59, 999);
            where.createdAt.lte = e;
        }
    }

    try {
        const mealLogs = await prisma.mealLog.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json(mealLogs);
    } catch (error) {
        next(error);
    }
}

export const getMealLogById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const id = req.params.id;

    try {
        const mealLog = await prisma.mealLog.findUnique({
            where: { id, userId },
            include: {
                foodLogs: {
                    include: { food: true }
                }
            }
        });

        if (!mealLog) return res.status(404).send("Meal log not found");
        return res.status(200).json(mealLog);
    } catch (error) {
        next(error);
    }
}

export const createMealLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const { type } = req.body;

    if (!type) return res.status(400).send("type is required");
    if (!VALID_MEAL_TYPES.includes(type)) {
        return res.status(400).send(`type must be one of: ${VALID_MEAL_TYPES.join(', ')}`);
    }

    try {
        const mealLog = await prisma.mealLog.create({
            data: { userId, type }
        });
        return res.status(201).json(mealLog);
    } catch (error) {
        next(error);
    }
}

export const updateMealLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const id = req.params.id;

    try {
        const existing = await prisma.mealLog.findUnique({ where: { id, userId } });
        if (!existing) return res.status(404).send("Meal log not found");

        if (req.body.type != null && !VALID_MEAL_TYPES.includes(req.body.type)) {
            return res.status(400).send(`type must be one of: ${VALID_MEAL_TYPES.join(', ')}`);
        }

        const updated = await prisma.mealLog.update({
            where: { id },
            data: { type: req.body.type }
        });

        return res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
}

export const deleteMealLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const id = req.params.id;

    try {
        const existing = await prisma.mealLog.findUnique({ where: { id, userId } });
        if (!existing) return res.status(404).send("Meal log not found");

        await prisma.mealLog.delete({ where: { id } });
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
}
