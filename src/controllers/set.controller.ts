import { NextFunction, Response } from 'express';
import prisma from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const getSetById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    if (!userId) return res.status(401).send('Token missing');

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

    if (!userId) return res.status(401).send('Token missing');

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


export const changeSet = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId = req.userId;

    if (!userId) return res.status(401).send('Token missing');

    const setId: string = req.params.id;

    if (!setId) return res.status(400).send("Bad Request");

    let type = req.body.type;

    const set = await prisma.setLog.findUnique({where: { id: setId, userId: userId }});

    if (!set) return res.status(404).send("Set not found");

    let reps = parseInt(req.body.reps);
    let weight = parseFloat(req.body.weight);

    if (!reps && !weight && !type) return res.status(400).send("Bad Request");

    if (!reps && set.reps) reps = set.reps;
    if (isNaN(reps) || reps < 1 || reps > 1000) return res.status(400).send("Invalid reps (1-1000)");

    if (!weight && set.weight) weight = set.weight;
    if (isNaN(weight) || weight < 0 || weight > 1000) return res.status(400).send("Invalid weight (0-1000 kg)");

    if (!type && set.type) type = set.type;
    if (type != null && typeof type !== 'string') return res.status(400).send("Invalid type");

    const exercise = await prisma.exerciseLog.findFirst({
        where: { id: set.exerciseId, userId }
    });

    if (!exercise) return res.status(403).send("Access Denied");

    try {
        const updatedSet = await prisma.setLog.update({
            where: { id: setId },
            data: {
                type,
                weight,
                reps,
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

    if (!userId) return res.status(401).send('Token missing');

    let { type, exerciseId} = req.body;

    const reps = parseInt(req.body.reps);

    const weight = parseFloat(req.body.weight);

    const exercise = await prisma.exerciseLog.findFirst({
        where: { id: exerciseId, userId }
    });

    if (!exercise) return res.status(403).send("Access Denied");

    if (exerciseId == null || reps == null || weight == null) return res.status(400).send("Bad Request");

    try {
        const set = await prisma.setLog.create({
            data: {
                type,
                userId,
                exerciseId,
                reps,
                weight
            }
        });
        return res.status(201).json(set);
    } catch (error) {
        next(error);
    }
}


export const deleteSet = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    if (!userId) return res.status(401).send('Token missing');

    const setId: string = req.params.id;

    if (!setId) return res.status(400).send("Bad Request");

    const set = await prisma.setLog.findUnique({where: { id: setId, userId: userId }});

    if (!set) return res.status(404).send("Set not found");

    const exercise = await prisma.exerciseLog.findFirst({
        where: { id: set.exerciseId, userId }
    });

    if (!exercise) return res.status(403).send("Access Denied");

    try {
        const deletedSet = await prisma.setLog.delete({
            where: { id: setId }
        });
        return res.status(200).json(deletedSet);
    } catch (error) {
        next(error);
    }
}