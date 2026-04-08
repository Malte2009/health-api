import { NextFunction, Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { MealType } from '@prisma/client';

const VALID_MEAL_TYPES = Object.values(MealType);

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const parseDateOnly = (value: unknown): Date | null => {
    if (typeof value !== 'string' || !DATE_ONLY_REGEX.test(value)) {
        return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    // Guard against impossible dates like 2026-02-31.
    if (
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day
    ) {
        return null;
    }

    return parsed;
};

const getUtcDayRange = (date: Date) => ({
    gte: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)),
    lte: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)),
});

export const getMealLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const { date, startDate, endDate } = req.query;

    const where: any = { userId };

    if (date) {
        const parsedDate = parseDateOnly(date);
        if (!parsedDate) return res.status(400).send('Invalid date format. Use YYYY-MM-DD');
        where.createdAt = getUtcDayRange(parsedDate);
    } else if (startDate || endDate) {
        where.createdAt = {};

        if (startDate) {
            const parsedStartDate = parseDateOnly(startDate);
            if (!parsedStartDate) return res.status(400).send('Invalid startDate format. Use YYYY-MM-DD');
            where.createdAt.gte = getUtcDayRange(parsedStartDate).gte;
        }

        if (endDate) {
            const parsedEndDate = parseDateOnly(endDate);
            if (!parsedEndDate) return res.status(400).send('Invalid endDate format. Use YYYY-MM-DD');
            where.createdAt.lte = getUtcDayRange(parsedEndDate).lte;
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
    const { type, date, order } = req.body;

    if (!type) return res.status(400).send("type is required");
    if (!VALID_MEAL_TYPES.includes(type)) {
        return res.status(400).send(`type must be one of: ${VALID_MEAL_TYPES.join(', ')}`);
    }

    if (typeof order != "number" || order < 0) {
        return res.status(400).send(`order must be a positive integer`);
    }

    const parsedDate = date == null ? null : parseDateOnly(date);
    if (date != null && !parsedDate) {
        return res.status(400).send('Invalid date format. Use YYYY-MM-DD');
    }

    try {
        const mealLog = await prisma.mealLog.create({
            data: {
                userId,
                type,
                order,
                ...(parsedDate ? { createdAt: parsedDate } : {}),
            }
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

        let order = req.body.order;
        let type = req.body.type;

        if (type == null && order == null) {
            return res.status(400).send("At least one of type or order must be provided for update");
        }

        if (order == null) order = existing.order;
        if (type == null) type = existing.type;

        if (typeof order != "number" || order < 0) {
            return res.status(400).send(`order must be a positive integer`);
        }

        if (req.body.type != null && !VALID_MEAL_TYPES.includes(req.body.type)) {
            return res.status(400).send(`type must be one of: ${VALID_MEAL_TYPES.join(', ')}`);
        }

        const updated = await prisma.mealLog.update({
            where: { id },
            data: { type, order }
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
