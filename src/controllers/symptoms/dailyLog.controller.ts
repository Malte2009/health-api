import { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../prisma/client';

export const getDailyLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
        const logs = await prisma.dailyLog.findMany({
            where: { userId: req.userId },
            orderBy: { date: 'desc' }
        });
        return res.json(logs);
    } catch (error) {
        next(error);
    }
};

export const getDailyLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { date } = req.params; // Using date as identifier or we can support id

        let query;
        if (date.length === 10) { // e.g., YYYY-MM-DD
            query = { date: new Date(date), userId: req.userId };
        } else {
            query = { id: date, userId: req.userId };
        }

        const log = await prisma.dailyLog.findFirst({ where: query });
        if (!log) return res.status(404).send('Not Found');
        return res.json(log);
    } catch (error) {
        next(error);
    }
};

export const createDailyLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
        const data = req.body;
        const logDate = data.date ? new Date(data.date) : new Date();
        logDate.setHours(0, 0, 0, 0); // Normalize to midnight for unique constraints

        const log = await prisma.dailyLog.create({
            data: {
                ...data,
                userId: req.userId,
                date: logDate,
            }
        });
        return res.status(201).json(log);
    } catch (error) {
        if ((error as any).code === 'P2002') {
            return res.status(409).send('DailyLog for this date already exists');
        }
        next(error);
    }
};

export const updateDailyLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { id } = req.params;
        const data = req.body;

        const existing = await prisma.dailyLog.findFirst({ where: { id, userId: req.userId }});
        if (!existing) return res.status(404).send('Not Found');

        const logDate = data.date ? new Date(data.date) : undefined;
        if (logDate) logDate.setHours(0, 0, 0, 0);

        const log = await prisma.dailyLog.update({
            where: { id },
            data: {
                ...data,
                date: logDate,
            }
        });
        return res.json(log);
    } catch (error) {
        next(error);
    }
};

export const deleteDailyLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { id } = req.params;
        const existing = await prisma.dailyLog.findFirst({ where: { id, userId: req.userId }});
        if (!existing) return res.status(404).send('Not Found');

        await prisma.dailyLog.delete({ where: { id } });
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
};

