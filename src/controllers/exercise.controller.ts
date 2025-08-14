import { NextFunction, Response } from 'express';
import prisma from '../prisma/client';
import {AuthenticatedRequest} from "../middleware/auth.middleware";

export const getExerciseNames = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    if (!userId) return res.status(401).send('Token missing');

    try {
        const exercises = await prisma.exerciseLog.findMany({
            where: { userId: userId },
            select: { name: true },
            distinct: ['name'],
            orderBy: { name: 'asc' }
        });

        return res.status(200).json(exercises.map(exercise => exercise.name));
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

export const changeExerciseInTraining = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId = req.userId;

    if (!userId) return res.status(401).send('Token missing');

    const exerciseId: string = req.params.id;

    if (!exerciseId) return res.status(400).send("Bad Request");

    let { name, notes, order } = req.body;

    const exercise = await prisma.exerciseLog.findUnique({where: { id: exerciseId, userId: userId }});

    if (!exercise) return res.status(404).send("Exercise not found");

    if (name == null && notes == null && order == null) return res.status(400).send("Bad Request");

    if (notes == null) notes = exercise.notes;
    if (name == null) name = exercise.name;
    if (order == null) order = exercise.order;

    try {
        const updatedExercise = await prisma.exerciseLog.update({
            where: { id: exerciseId },
            data: {
                name,
                notes,
                order
            },
            include: { sets: true }
        });
        return res.status(200).json(updatedExercise);
    } catch (error) {
        next(error);
    }
}

export const addExerciseToTraining = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId = req.userId;

    if (!userId) return res.status(401).send('Token missing');

    let { name, trainingId, notes, order } = req.body;

    if (!name || !trainingId) return res.status(400).send("Bad Request");

    if (notes != null && typeof notes !== 'string') return res.status(400).send("Notes must be a string");

    if (order != null && typeof order !== 'number') return res.status(400).send("Order must be a number");

    const training = await prisma.trainingLog.findUnique({where: { id: trainingId, userId: userId }});

    if (!training) return res.status(404).send("Training not found");

    try {
        const exercise = await prisma.exerciseLog.create({
            data: {
                trainingId,
                userId,
                name,
                notes: notes || null,
                order: order
            },
            include: { sets: true }
        });
        return res.status(201).json(exercise);
    } catch (error) {
        next(error);
    }
}

export const deleteExerciseFromTraining = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
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