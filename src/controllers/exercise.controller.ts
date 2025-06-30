import { NextFunction, Response } from 'express';
import prisma from '../prisma/client';
import {AuthenticatedRequest} from "../middleware/auth.middleware";

export const getExerciseNames = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    if (!userId) return res.status(401).send('Token missing');

    try {
        const exerciseNames = await prisma.exerciseLog.findMany({
            where: { userId: userId },
            select: { name: true },
            distinct: ['name'],
            orderBy: { name: 'asc' }
        });

        return res.status(200).json(exerciseNames);
    } catch (error) {
        return next(error);
    }
}

export const getExerciseById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    const exerciseId: string = req.params.id;

    if (!userId) return res.status(401).send('Token missing');

    if (!exerciseId) return res.status(400).send("Exercise ID is required");

    try {
        const exercise = await prisma.exerciseLog.findUnique({
            where: { id: exerciseId, userId: userId },
            include: { sets: true }
        });

        if (!exercise) return res.status(404).send("Exercise not found");

        return res.status(200).json(exercise);
    } catch (error) {
        next(error);
    }
}

export const changeExerciseOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId = req.userId;

    if (!userId) return res.status(401).send('Token missing');

    const exerciseId: string = req.params.id;

    if (!exerciseId) return res.status(400).send("Bad Request");

    const order = req.body.order;

    console.log("Order: ", order, "Type: ", typeof(order)   );

    if (typeof(order) != "number") return res.status(400).send("Bad Request");

    try {
        const exercise = await prisma.exerciseLog.findUnique({where: { id: exerciseId,
            userId: userId }});
        
        if (!exercise) return res.status(404).send("Exercise not found");

        const updatedExercise = await prisma.exerciseLog.update({
            where: { id: exerciseId },
            data: {
                order: order
            }
        });

        return res.status(200).json(updatedExercise);
    } catch (error) {
        next(error);
    }
}

export const changeExercise = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId = req.userId;

    if (!userId) return res.status(401).send('Token missing');

    const exerciseId: string = req.params.id;

    if (!exerciseId) return res.status(400).send("Bad Request");

    let { name } = req.body;

    if (!name) return res.status(400).send("Bad Request");

    const exercise = await prisma.exerciseLog.findUnique({where: { id: exerciseId, userId: userId }});

    if (!exercise) return res.status(404).send("Exercise not found");

    try {
        const updatedExercise = await prisma.exerciseLog.update({
            where: { id: exerciseId },
            data: {
                name
            },
            include: { sets: true }
        });
        return res.status(200).json(updatedExercise);
    } catch (error) {
        next(error);
    }
}

export const createExercise = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId = req.userId;

    if (!userId) return res.status(401).send('Token missing');

    let { name, trainingId } = req.body;

    if (!name || !trainingId) return res.status(400).send("Bad Request");

    const training = await prisma.trainingLog.findUnique({where: { id: trainingId, userId: userId }});

    if (!training) return res.status(404).send("Training not found");

    try {
        const exercise = await prisma.exerciseLog.create({
            data: {
                trainingId,
                userId,
                name
            }
        });
        return res.status(201).json(exercise);
    } catch (error) {
        next(error);
    }
}

export const deleteExercise = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    if (!userId) return res.status(401).send('Token missing');

    const exerciseId: string = req.params.id;

    if (!exerciseId) return res.status(400).send("Bad Request");

    const exercise = await prisma.exerciseLog.findUnique({where: { id: exerciseId, userId: userId }});

    if (!exercise) return res.status(404).send("Exercise not found");

    try {
        await prisma.exerciseLog.delete({where: { id: exerciseId }});
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
}