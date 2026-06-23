import { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../prisma/client';
import { getOrCreateHealthDayId } from '../../utility/healthDay';

export const getSyncopes = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
        const syncopes = await prisma.syncopeLog.findMany({
            where: { userId: req.userId },
            include: { symptoms: true },
            orderBy: { timestamp: 'desc' }
        });
        return res.json(syncopes);
    } catch (error) {
        next(error);
    }
};

export const getSyncope = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { id } = req.params;
        const syncope = await prisma.syncopeLog.findFirst({
            where: { id, userId: req.userId },
            include: { symptoms: true }
        });
        if (!syncope) return res.status(404).send('Not Found');
        return res.json(syncope);
    } catch (error) {
        next(error);
    }
};

export const createSyncope = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
        req.body.type = req.body?.type.toUpperCase();
        const data = req.body;

        if (!data.name) return res.status(400).send("Name is required");

        const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
        const healthDayId = await getOrCreateHealthDayId(req.userId, timestamp);

        const syncope = await prisma.syncopeLog.create({
            data: {
                ...data,
                userId: req.userId,
                healthDayId,
                timestamp,
            }
        });
        return res.status(201).json(syncope);
    } catch (error) {
        next(error);
    }
};

export const updateSyncope = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { id } = req.params;
        const data = req.body;

        const existing = await prisma.syncopeLog.findFirst({ where: { id, userId: req.userId }});
        if (!existing) return res.status(404).send('Not Found');

        const timestamp = data.timestamp ? new Date(data.timestamp) : existing.timestamp;
        const healthDayId = await getOrCreateHealthDayId(req.userId, timestamp);

        const syncope = await prisma.syncopeLog.update({
            where: { id },
            data: {
                type: "SYNCOPE",
                name: data.name,
                userId: req.userId,
                healthDayId,
                severity: parseInt(data.severity),
                notes: data.notes,
                trigger: data.trigger,
                position: data.position,
                outcome: data.outcome,
                amnesia: data.amnesia,
                amnesiaDurationMinutes: parseInt(data.amnesiaDurationMinutes),
                injuries: data.injuries,
                workoutId: data.workoutId ?? data.trainingLogId,
                activityBefore: data.activityBefore,
                timestamp: data.timestamp ? timestamp : undefined,
            }
        });
        return res.json(syncope);
    } catch (error) {
        next(error);
    }
};

export const deleteSyncope = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { id } = req.params;
        const existing = await prisma.syncopeLog.findFirst({ where: { id, userId: req.userId }});
        if (!existing) return res.status(404).send('Not Found');

        await prisma.syncopeLog.delete({ where: { id } });
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
};
