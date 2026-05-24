import { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../prisma/client';

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
        const syncope = await prisma.syncopeLog.create({
            data: {
                ...data,
                userId: req.userId,
                timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
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

        const syncope = await prisma.syncopeLog.update({
            where: { id },
            data: {
                ...data,
                timestamp: data.timestamp ? new Date(data.timestamp) : undefined,
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

