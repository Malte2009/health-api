import { NextFunction, Response } from 'express';
import prisma from '../../prisma/client';
import {AuthenticatedRequest} from "../../middleware/auth.middleware";
import { calculateBurnedCalories } from '../../utility/calculateBurnedCalories';

export const getTrainingById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId
    const trainingLogId: string = req.params.id;

    if (!userId) return res.status(401).send("Unauthorized");

    if (!trainingLogId) return res.status(400).send("Bad Request");

    try {
        const trainingLog = await prisma.trainingLog.findUnique({
            where: { id: trainingLogId, userId: userId },
            include: { exercises: { include: { sets: {
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

    if (!userId) return res.status(401).send("Unauthorized");

    try {
        const trainingLogs = await prisma.trainingLog.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' },
            include:  { exercises: { include: { sets: true } } }
        });
        return res.status(200).json(trainingLogs);
    } catch (error) {
        next(error);
    }
}

export const getTrainingTypes = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    if (!userId) return res.status(401).send("Unauthorized");

    try {
        const trainings = await prisma.trainingLog.findMany({
            where: { userId: userId },
            select: { type: true },
            distinct: ['type'],
            orderBy: { type: 'asc' }
        });
        return res.status(200).json(trainings.map(training => (training.type)));
    } catch (error) {
        next(error);
    }
}

export const updateTraining = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const trainingLogId: string = req.params.id;

    if (!userId) return res.status(401).send("Unauthorized");

    let { notes, type, exercises, pauses, pauseLength, mode } = req.body;

    let avgHeartRate = parseInt(req.body.avgHeartRate);
    let duration = parseInt(req.body.duration);

    const training = await prisma.trainingLog.findUnique({
        where: { id: trainingLogId, userId: userId },
        include: { exercises: { include: { sets: true } } }
    });

    if (!training) return res.status(404).send("Training Not Found");

    if (!type && !notes && !exercises && !avgHeartRate && !duration) return res.status(400).send("Bad Request");

    if (notes == null && training.notes != null) notes = training.notes;
    if (type == null && training.type != null) type = training.type;
    if (exercises == null && training.exercises != null) exercises = training.exercises;
    if (avgHeartRate == null && training.avgHeartRate != null) avgHeartRate = training.avgHeartRate;
    if (duration == null && training.duration != null) duration = training.duration;
    if (pauses == null && training.pauses != null) pauses = training.pauses;
    if (pauseLength == null && training.pauseLength != null) pauseLength = training.pauseLength;
    if (mode == null && training.mode != null) mode = training.mode;

    //TODO: Validate exercises & sets

    let caloriesBurned = await calculateBurnedCalories(userId, mode, duration, pauses, pauseLength);

    try {
        const updatedTrainingLog = await prisma.trainingLog.update({
            where: { id: trainingLogId, userId: userId },
            data: {
                type: type,
                avgHeartRate: avgHeartRate,
                notes: notes || null,
                duration,
                caloriesBurned: Math.round(caloriesBurned * 100) / 100,
                mode,
                pauseLength,
                pauses,
                exercises: {
                    update: exercises?.map((exercise: any) => ({
                        where: { id: exercise.id },
                        data: {
                            name: exercise.name,
                            order: exercise.order,
                            user: { connect: { id: userId } },
                            sets: {
                                update: exercise.sets
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
                }}}))
                }
            },
            include: { exercises: { include: { sets: true } } }
        });
        return res.status(200).json(updatedTrainingLog);
    } catch (error) {
        return next(error);
    }
}


export const createTraining = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    if (!userId) return res.status(401).send("Unauthorized");

    let { notes, type, pauses, pauseLength, mode } = req.body;

    const avgHeartRate: number = req.body.avgHeartRate;
    const duration: number = req.body.duration;

    //Validate request body
    if (!req.body) return res.status(400).send("Bad Request");

    if (!type) return res.status(400).send("Training type is required");

    if (!pauses || pauses < 0) pauses = 0;
    if (!pauseLength || pauseLength < 0) pauseLength = 0;

    let caloriesBurned = await calculateBurnedCalories(userId, mode, duration, pauses, pauseLength);

    try {
        const training = await prisma.trainingLog.create({
            data: {
                userId: userId,
                type,
                notes,
                avgHeartRate,
                duration,
                caloriesBurned: Math.round(caloriesBurned)
            },
            include: { exercises: { include: { sets: true } } }
        });
        return res.status(201).json(training);
    } catch (error) {
        return next(error);
    }
}

export const deleteTraining = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const trainingLogId: string = req.params.id;

    if (!userId || !trainingLogId) return res.status(400).send("Bad Request");

    try {
        await prisma.trainingLog.delete({
            where: { id: trainingLogId, userId: userId }
        });

        return res.status(200).send("Training Log Deleted Successfully");
    } catch (error) {
        return next(error);
    }
}