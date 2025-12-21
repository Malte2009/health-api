import { NextFunction, Response } from 'express';
import prisma from '../prisma/client';
import {AuthenticatedRequest} from "../middleware/auth.middleware";

export const getExerciseNames = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    if (!userId) return res.status(401).send('Token missing');

    try {
        const exercises = await prisma.exercise.findMany({
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

export const getExerciseByName = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    const exerciseName: string = req.params.name;

    if (!userId) return res.status(401).send('Token missing');

    if (!exerciseName) return res.status(400).send("Exercise name is required");

    try {
        const exercise = await prisma.exercise.findFirst({
            where: {
                name: exerciseName,
                userId: userId
            },
            include: {
                exerciseLogs: true
            }
        });

        if (!exercise) return res.status(404).send("Exercise not found");

        return res.status(200).json(exercise);
    } catch (error) {
        return next(error);
    }
}

export const createExercise = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId = req.userId;

    if (!userId) return res.status(401).send('Token missing');

    const name = req.body.name;

    if (!name) return res.status(400).send("Bad Request");

    try {
        const newExercise = await prisma.exercise.create({
            data: {
                name,
                userId
            }
        });
        return res.status(201).json(newExercise);
    } catch (error) {
        next(error);
    }
}

export const changeExercise = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId = req.userId;

    if (!userId) return res.status(401).send('Token missing');

    const exerciseName: string = req.params.name;

    if (!exerciseName) return res.status(400).send("Bad Request");

    let name = req.body.name;

    const exercise = await prisma.exercise.findFirst({where: { name: exerciseName, userId: userId }});

    if (!exercise) return res.status(404).send("Exercise not found");

    if (name == null) return res.status(400).send("Bad Request");

    try {
        const updatedExercise = await prisma.exercise.update({
            where: {
                name_userId: {
                    name: exerciseName,
                    userId: userId
                }
            },
            data: {
                name
            }
        });
        return res.status(200).json(updatedExercise);
    } catch (error) {
        next(error);
    }
}

export const deleteExercise = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    if (!userId) return res.status(401).send('Token missing');

    const exerciseName: string = req.params.name;

    if (!exerciseName) return res.status(400).send("Bad Request");

    try {
        const exercise = await prisma.exercise.findFirst({where: { name:  exerciseName, userId: userId}});

        if (!exercise) return res.status(404).send("Exercise not found");

        await prisma.exercise.delete({ where: {name_userId: {
            name: exercise.name,
            userId: userId
        }}});

        return res.status(204).send();
    } catch (error) {
        next(error);
    }
}