import { NextFunction, Response } from 'express';
import prisma from '../prisma/client';
import {AuthenticatedRequest} from "../middleware/auth.middleware";
import { calculateBurnedCalories } from '../utility/calculateBurnedCalories';

export const getTrainingById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId
    const trainingLogId: string = req.params.id;

    if (!trainingLogId) return res.status(400).send("Bad Request");

    try {
        const trainingLog = await prisma.trainingLog.findUnique({
            where: { id: trainingLogId, userId: userId },
            include: { exerciseLogs: { include: { sets: {
                orderBy: [{ order: "asc" }, { createdAt: "asc" } ]
            } }, orderBy: {order: "asc"} } }
        });

        if (!trainingLog) return res.status(404).send("Training Log Not Found");

        return res.status(200).json(trainingLog);
    } catch (error) {
        next(error);
    }
}

export const getTraining = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    try {
        const trainingLogs = await prisma.trainingLog.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' },
            include:  { exerciseLogs: { include: { sets: true } } }
        });
        return res.status(200).json(trainingLogs);
    } catch (error) {
        next(error);
    }
}

export const getTrainingNames = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    try {
        const trainings = await prisma.trainingLog.findMany({
            where: { userId: userId },
            select: { name: true },
            distinct: ['name'],
            orderBy: { type: 'asc' }
        });
        return res.status(200).json(trainings.map(training => (training.name)));
    } catch (error) {
        next(error);
    }
}

export const updateTraining = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const trainingLogId: string = req.params.id;
    let { notes, type, exerciseLogs, pauses, pauseLength, name } = req.body;

    let avgHeartRate = parseInt(req.body.avgHeartRate);
    let duration = parseInt(req.body.duration);

    const training = await prisma.trainingLog.findUnique({
        where: { id: trainingLogId, userId: userId },
        include: { exerciseLogs: { include: { sets: true } } }
    });

    if (!training) return res.status(404).send("Training Not Found");

    if (!type && !notes && !exerciseLogs && !avgHeartRate && !duration) return res.status(400).send("Bad Request");

    if (notes == null && training.notes != null) notes = training.notes;
    if (type == null && training.type != null) type = training.type;
    if (exerciseLogs == null && training.exerciseLogs != null) exerciseLogs = training.exerciseLogs;
    if (avgHeartRate == null && training.avgHeartRate != null) avgHeartRate = training.avgHeartRate;
    if (duration == null && training.duration != null) duration = training.duration;
    if (pauses == null && training.pauses != null) pauses = training.pauses;
    if (pauseLength == null && training.pauseLength != null) pauseLength = training.pauseLength;
    if (name == null && training.name != null) name = training.name;

    //TODO: Validate exercises & sets

    let caloriesBurned = await calculateBurnedCalories(userId, avgHeartRate, type, duration, pauses, pauseLength);

    try {
        const updatedTrainingLog = await prisma.trainingLog.update({
            where: { id: trainingLogId, userId: userId },
            data: {
                type: type,
                avgHeartRate: avgHeartRate,
                notes: notes || null,
                duration,
                caloriesBurned: Math.round(caloriesBurned * 100) / 100,
                name,
                pauseLength,
                pauses,
                exerciseLogs: {
                    update: exerciseLogs?.map((exerciseLog: any) => ({
                        where: { id: exerciseLog.id },
                        data: {
                            order: exerciseLog.order,
                            exercise: {
                                connectOrCreate: {
                                    where: {
                                        name_userId: {
                                            name: exerciseLog.name,
                                            userId: userId
                                        }
                                    },
                                    create: {
                                        name: exerciseLog.name,
                                        userId: userId
                                    }
                                }
                            },
                            user: { connect: { id: userId } },
                            sets: {
                                update: exerciseLog.sets
                                    .filter((set: any) => set.id) // Filter out sets with missing id
                                    .map((set: any) => ({
                                        where: { id: set.id },
                                        data: {
                                            reps: set.reps,
                                            weight: set.weight,
                                            order: set.order || 0,
                                            user: { connect: { id: userId } }
                                        }
                                        }))
                            }
                        }
                    }))
                },
            },
            include: { exerciseLogs: { include: { sets: true } } }
        });
        return res.status(200).json(updatedTrainingLog);
    } catch (error) {
        return next(error);
    }
}


export const createTraining = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    let { notes, type, pauses, pauseLength, name } = req.body;

    const avgHeartRate: number = req.body.avgHeartRate;
    const duration: number = req.body.duration;

    //Validate request body
    if (!req.body) return res.status(400).send("Bad Request");

    if (!type) return res.status(400).send("Training type is required");

    if (!pauses || pauses < 0) pauses = 0;
    if (!pauseLength || pauseLength < 0) pauseLength = 0;

    let caloriesBurned = await calculateBurnedCalories(userId, avgHeartRate, type, duration, pauses, pauseLength);

    try {
        const training = await prisma.trainingLog.create({
            data: {
                userId: userId,
                name,
                type,
                notes,
                avgHeartRate,
                duration,
                caloriesBurned: Math.round(caloriesBurned),
                pauses,
                pauseLength
            },
            include: { exerciseLogs: { include: { sets: true } } }
        });
        return res.status(201).json(training);
    } catch (error) {
        return next(error);
    }
}

export const deleteTraining = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const trainingLogId: string = req.params.id;

    if (!trainingLogId) return res.status(400).send("Bad Request");

    try {
        await prisma.trainingLog.delete({
            where: { id: trainingLogId, userId: userId }
        });

        return res.status(200).send("Training Log Deleted Successfully");
    } catch (error) {
        return next(error);
    }
}

export const recalculateTrainingCalories = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    const trainings = await prisma.trainingLog.findMany({
        where: { userId: userId }
    });

    try {
        for (const log of trainings) {
            const caloriesBurned = await calculateBurnedCalories(userId, log.avgHeartRate || 0, log.type, log.duration || 0, log.pauses || 0, log.pauseLength || 0);

            await prisma.trainingLog.update({
                where: { id: log.id },
                data: { caloriesBurned: Math.round(caloriesBurned) }
            });
        }
    } catch (error) {
        return next(error);
    }

    return res.status(200).send("Recalculation Completed");
}