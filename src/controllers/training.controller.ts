import { NextFunction, Response } from 'express';
import prisma from '../prisma/client';
import {AuthenticatedRequest} from "../middleware/auth.middleware";

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
        const trainingTypes = await prisma.trainingLog.findMany({
            where: { userId: userId },
            select: { type: true },
            distinct: ['type'],
            orderBy: { type: 'asc' }
        });
        return res.status(200).json(trainingTypes);
    } catch (error) {
        next(error);
    }
}

export const updateTraining = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const trainingLogId: string = req.params.id;

    if (!userId) return res.status(401).send("Unauthorized");

    let { notes, type, exercises, pauses, pauseLength } = req.body;

    let avgHeartRate = parseInt(req.body.avgHeartRate);
    let durationMinutes = parseInt(req.body.durationMinutes);

    const training = await prisma.trainingLog.findUnique({
        where: { id: trainingLogId, userId: userId },
        include: { exercises: { include: { sets: true } } }
    });

    if (!training) return res.status(404).send("Training Not Found");

    if (!type && !notes && !exercises && !avgHeartRate && !durationMinutes) return res.status(400).send("Bad Request");

    if (!notes && training.notes) notes = training.notes;
    if (notes != null && typeof notes !== 'string') return res.status(400).send("Notes must be a string");
    if (notes != null && notes.length > 500) return res.status(400).send("Notes must be at most 500 characters long");
    if (notes != null && notes.length < 1) return res.status(400).send("Notes must be at least 1 character long");

    if (!type && training.type) type = training.type;
    if (type != null && typeof type !== 'string') return res.status(400).send("Type must be a string");
    if (type != null && type.length > 100) return res.status(400).send("Type must be at most 100 characters long");
    if (type != null && type.length < 1) return res.status(400).send("Type must be at least 1 character long");

    if (!exercises && training.exercises) exercises = training.exercises;
    if (exercises && !Array.isArray(exercises)) return res.status(400).send("Exercises must be an array");
    if (exercises && exercises.length > 100) return res.status(400).send("Too many exercises (max 100)");

    if (avgHeartRate == null && training.avgHeartRate) avgHeartRate = training.avgHeartRate;
    if (isNaN(avgHeartRate) || avgHeartRate < 30 || avgHeartRate > 220) return res.status(400).send("Invalid heart rate (30-220)");

    if (durationMinutes == null && training.durationMinutes) durationMinutes = training.durationMinutes;
    if (isNaN(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) return res.status(400).send("Invalid duration (1-600 minutes)");

    if (!pauses && training.pauses) pauses = training.pauses;
    if (pauses == null) pauses = 0;
    if (isNaN(pauses) || pauses < 0 || pauses > 100) return res.status(400).send("Invalid number of pauses (0-100)");

    if (!pauseLength && training.pauseLength) pauseLength = training.pauseLength;
    if (pauseLength == null) pauseLength = 0;
    if (isNaN(pauseLength) || pauseLength < 0 || pauseLength > 60) return res.status(400).send("Invalid pause length (0-60 minutes)");

    //TODO: Validate exercises & sets

    const data = await prisma.user.findUnique({
        where: { id: userId },
        select: { gender: true, birthYear: true }
    });

    const weight = (await prisma.bodyLog.findFirst({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
        select: { weight: true }
    }))?.weight;

    let caloriesBurned = 0;

    if (data && weight) {
        const age = new Date().getFullYear() - data.birthYear;
        if (data.gender === "male") {
            caloriesBurned = ((-55.0969 + (0.6309 * avgHeartRate) + (0.1988 * weight) + (0.2017 * age)) / 4.184) * durationMinutes
        } else if (data.gender === "female") {
            caloriesBurned = ((-20.4022 + (0.4472 * avgHeartRate) - (0.1263 * weight) + (0.074 * age)) / 4.184) * durationMinutes
        }
    }

    try {
        const updatedTrainingLog = await prisma.trainingLog.update({
            where: { id: trainingLogId, userId: userId },
            data: {
                type: type,
                avgHeartRate: avgHeartRate,
                notes: notes || null,
                durationMinutes,
                caloriesBurned: Math.round(caloriesBurned * 100) / 100,
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
        next(error);
    }
}


export const createTraining = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    if (!userId) return res.status(401).send("Unauthorized");

    let { notes, type, pauses, pauseLength } = req.body;

    const avgHeartRate: number | null = req.body.avgHeartRate;
    const duration: number | null = req.body.duration;

    //Validate request body
    if (!req.body) return res.status(400).send("Bad Request");

    if (!type) return res.status(400).send("Training type is required");
    if (typeof type !== 'string') return res.status(400).send("Type must be a string");
    if (type.length < 1 || type.length > 100) return res.status(400).send("Type must be between 1 and 100 characters long");

    if (notes && typeof notes !== 'string') return res.status(400).send("Notes must be a string");
    if (notes.length < 1 || notes.length > 500) return res.status(400).send("Notes must be between 1 and 500 characters long");

    if (pauses == null) pauses = 0;
    if (isNaN(pauses) || pauses < 0 || pauses > 100) return res.status(400).send("Invalid number of pauses (0-100)");

    if (pauseLength == null) pauseLength = 0;
    if (isNaN(pauseLength) || pauseLength < 0 || pauseLength > 60) return res.status(400).send("Invalid pause length (0-60 minutes)");

    if (avgHeartRate != null && isNaN(avgHeartRate)) return res.status(400).send("Invalid heart rate");
    if (avgHeartRate != null && (avgHeartRate < 30 || avgHeartRate > 220)) return res.status(400).send("Invalid heart rate (30-220)");

    if (duration != null && isNaN(duration)) return res.status(400).send("Invalid duration");
    if (duration != null && (duration < 1 || duration > 600)) return res.status(400).send("Invalid duration (1-600 minutes)");

    let burnedCalories = 0;

    const data = await prisma.user.findUnique({
        where: { id: userId },
        select: { gender: true, birthYear: true }
    })

    const weight = (await prisma.bodyLog.findFirst({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
        select: { weight: true }
    }))?.weight;

    if (avgHeartRate && duration && data && weight) {
        const age = new Date().getFullYear() - data?.birthYear;
        const activeDuration = duration - pauses * pauseLength;

        let activeColoriesPerMinute = 0;

        if (data.gender === "male") {
            activeColoriesPerMinute = ((-55.0969 + (0.6309 * avgHeartRate) + (0.1988 * weight) + (0.2017 * age)) / 4.184)
        } else if (data.gender === "female") {
            activeColoriesPerMinute = ((-20.4022 + (0.4472 * avgHeartRate) - (0.1263 * weight) + (0.074 * age)) / 4.184)
        }

        let passiveCaloriesPerMin = activeColoriesPerMinute * 0.7;

        burnedCalories = (activeColoriesPerMinute * activeDuration) + (passiveCaloriesPerMin * pauseLength * pauses);
    }

    try {
        const training = await prisma.trainingLog.create({
            data: {
                userId: userId,
                type,
                notes,
                avgHeartRate,
                durationMinutes: duration,
                caloriesBurned: Math.round(burnedCalories)
            }
        });
        return res.status(201).json(training);
    } catch (error) {
        next(error);
    }
}

export const deleteTraining = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const trainingLogId: string = req.params.id;

    if (!userId || !trainingLogId) return res.status(400).send("Bad Request");

    try {
        const deletedTrainingLog = await prisma.trainingLog.delete({
            where: { id: trainingLogId, userId: userId }
        });

        return res.status(200).send("Training Log Deleted Successfully");
    } catch (error) {
        next(error);
    }
}