import { NextFunction, Response } from 'express';
import prisma from '../../prisma/client';
import {AuthenticatedRequest} from "../../middleware/auth.middleware";

export const getExerciseLogById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const exerciseLogId: string = req.params.id;

    if (!exerciseLogId) return res.status(400).send("Exercise log ID is required");

    try {
        const exerciseLog = await prisma.exerciseLog.findUnique({
            where: { id: exerciseLogId, userId: userId },
            include: { sets: true }
        });

        if (!exerciseLog) return res.status(404).send("Exercise log not found");

        return res.status(200).json(exerciseLog);
    } catch (error) {
        next(error);
    }
}

export const changeExerciseLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId = req.userId;
    const exerciseLogId: string = req.params.id;

    if (!exerciseLogId) return res.status(400).send("Bad Request");

    let { name, notes, order } = req.body;

    const exerciseLog = await prisma.exerciseLog.findUnique({where: { id: exerciseLogId, userId: userId }, include: {
        exercise: true
    }});

    if (!exerciseLog) return res.status(404).send("ExerciseLog not found");

    if (name == null && notes == null && order == null) return res.status(400).send("Bad Request");

    if (notes == null) notes = exerciseLog.notes;
    if (name == null) name = exerciseLog.exercise.name;
    if (order == null) order = exerciseLog.order;

    try {
        const updatedExerciseLog = await prisma.exerciseLog.update({
            where: { id: exerciseLogId },
            data: {
                notes,
                order,
                exercise: {
                    connectOrCreate: {
                        where: {
                            name_userId: {
                                name: name,
                                userId: userId
                            }
                        },
                        create: {
                            name: name,
                            userId: userId
                        },
                    },
                },
            },
            include: { sets: true }
        });
        return res.status(200).json(updatedExerciseLog);
    } catch (error) {
        next(error);
    }
}

export const createExerciseLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId = req.userId;
    let { name, trainingId, notes, order } = req.body;

    if (!name || !trainingId) return res.status(400).send("Bad Request");
    if (notes != null && typeof notes !== 'string') return res.status(400).send("Notes must be a string");
    if (order != null && typeof order !== 'number') return res.status(400).send("Order must be a number");

    const training = await prisma.trainingLog.findUnique({where: { id: trainingId, userId: userId }});

    if (!training) return res.status(404).send("Training not found");

    try {
        const exerciseLog = await prisma.exerciseLog.create({
            data: {
                notes: notes || null,
                order: order,
                exercise: {
                    connectOrCreate: {
                        where: {
                            name_userId: {
                                name: name,
                                userId: userId
                            }
                        },
                        create: {
                            name: name,
                            userId: userId
                        }
                    }
                },
                training: {
                    connect: { id: trainingId }
                },
                user: {
                    connect: { id: userId }
                }
            },
            include: { sets: true }
        });
        return res.status(201).json(exerciseLog);
    } catch (error) {
        next(error);
    }
}

export const deleteExerciseLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const exerciseLogId: string = req.params.id;

    if (!exerciseLogId) return res.status(400).send("Bad Request");

    const exerciseLog = await prisma.exerciseLog.findUnique({where: { id: exerciseLogId, userId: userId }});

    if (!exerciseLog) return res.status(404).send("ExerciseLog not found");

    try {
        await prisma.exerciseLog.delete({where: { id: exerciseLogId }});
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
}