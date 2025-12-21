import { NextFunction, Response } from 'express';
import prisma from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const getSetById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const setId: string = req.params.id;

    if (!setId) return res.status(400).send("Bad Request");

    try {
        const set = await prisma.setLog.findUnique({
            where: { id: setId, userId: userId },
        });
        
        if (!set) return res.status(404).send("Set not found");

        return res.status(200).json(set);
    } catch (error) {
        return next(error);
    }
}

export const getSetTypes = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    try {
        const sets = await prisma.setLog.findMany({
            where: { userId: userId },
            select: { type: true },
            distinct: ['type'],
            orderBy: { type: 'asc' }
        });
        return res.status(200).json(sets.map(set => (set.type)));
    } catch (error) {
        return next(error);
    }
}

export const getSetUnits = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    try {
        const sets = await prisma.setLog.findMany({
            where: { userId: userId },
            select: { repUnit: true },
            distinct: ['repUnit'],
            orderBy: { repUnit: 'asc' }
        });
        
        return res.status(200).json(sets.map(set => (set.repUnit)));
    } catch (error) {
        return next(error);
    }
}



export const changeSet = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId = req.userId;
    const setId: string = req.params.id;

    if (!setId) return res.status(400).send("Bad Request");

    let { type, repUnit } = req.body;

    const set = await prisma.setLog.findUnique({where: { id: setId, userId: userId }});

    if (!set) return res.status(404).send("Set not found");

    let reps = parseInt(req.body.reps);
    let weight = parseFloat(req.body.weight);

    if (!reps && !weight && !type) return res.status(400).send("Bad Request");

    if (!reps && set.reps) reps = set.reps;
    if (!weight && set.weight) weight = set.weight;
    if (!type && set.type) type = set.type;
    if (!repUnit && set.repUnit) repUnit = set.repUnit;

    const exerciseLog = await prisma.exerciseLog.findFirst({
        where: { id: set.exerciseLogId, userId }
    });

    if (!exerciseLog) return res.status(403).send("Access Denied");

    try {
        const updatedSet = await prisma.setLog.update({
            where: { id: setId },
            data: {
                type,
                weight,
                reps,
                repUnit
            }
        });
        return res.status(200).json(updatedSet);
    } catch (error) {
        next(error);
    }
}

export const createSet = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId = req.userId;
    const reps = parseInt(req.body.reps);
    const weight = parseFloat(req.body.weight);
    let { type, exerciseLogId, repUnit} = req.body;

    const exerciseLog = await prisma.exerciseLog.findFirst({
        where: { id: exerciseLogId, userId }
    });

    if (!exerciseLog) return res.status(403).send("Access Denied");

    if (reps == null || isNaN(reps)) return res.status(400).send("Reps must be a number");
    if (weight == null || isNaN(weight)) return res.status(400).send("Weight must be a number");
    if (!type || type.length === 0) return res.status(400).send("Type cannot be empty");
    if (!repUnit || repUnit.length === 0) return res.status(400).send("Rep unit cannot be empty");

    try {
        const set = await prisma.setLog.create({
            data: {
                type,
                exerciseLogId,
                reps,
                weight,
                repUnit,
                userId
            }
        });
        return res.status(201).json(set);
    } catch (error) {
        next(error);
    }
}


export const deleteSet = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const setId: string = req.params.id;

    if (!setId) return res.status(400).send("Bad Request");

    const set = await prisma.setLog.findUnique({where: { id: setId, userId: userId }});

    if (!set) return res.status(404).send("Set not found");

    const exerciseLog = await prisma.exerciseLog.findFirst({
        where: { id: set.exerciseLogId, userId }
    });

    if (!exerciseLog) return res.status(403).send("Access Denied");

    try {
        await prisma.setLog.delete({
            where: { id: setId }
        });
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
}