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
                orderBy: { createdAt: "asc" }
            } } } }
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

    const notes = req.body.notes

    const type = req.body.type;

    if (!type) return res.status(400).send("Training type is required");

    const avgHeartRate = parseInt(req.body.avgHeartRate);

    if (isNaN(avgHeartRate) || avgHeartRate < 30 || avgHeartRate > 220) return res.status(400).send("Invalid heart rate (30-220)");

    const durationMinutes = parseInt(req.body.durationMinutes);

    if (isNaN(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) return res.status(400).send("Invalid duration (1-600 minutes)");

    if (!userId || !trainingLogId || !avgHeartRate || !durationMinutes) return res.status(400).send("Bad Request");

    const data = await prisma.user.findUnique({
        where: { id: userId },
        select: { gender: true, birthYear: true }
    })

    const weight = (await prisma.bodyLog.findFirst({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
        select: { weight: true }
    }))?.weight;

    if (!data || !weight) return res.status(404).send("User Not Found");

    const age = new Date().getFullYear() - data.birthYear;

    let burnedCalories = 0;

    if (data.gender === "male") {
        burnedCalories = ((-55.0969 + (0.6309 * avgHeartRate) + (0.1988 * weight) + (0.2017 * age)) / 4.184) * durationMinutes
    } else if (data.gender === "female") {
        burnedCalories = ((-20.4022 + (0.4472 * avgHeartRate) - (0.1263 * weight) + (0.074 * age)) / 4.184) * durationMinutes
    }

    try {
        const updatedTrainingLog = await prisma.trainingLog.update({
            where: { id: trainingLogId, userId: userId },
            data: {
                type: type,
                avgHeartRate: avgHeartRate,	
                notes: notes || null,
                durationMinutes,
                caloriesBurned: Math.round(burnedCalories * 100) / 100
            }
        });
        return res.status(200).json(updatedTrainingLog);
    } catch (error) {
        next(error);
    }
}


export const createTraining = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {

    if (!req.body) return res.status(400).send("Bad Request");

    if (!req.body.type) return res.status(400).send("Training type is required");

    const userId = req.userId;

    if (!userId) return res.status(401).send("Unauthorized");

    const avgHeartRate = parseInt(req.body.avgHeartRate);

    if (isNaN(avgHeartRate) || avgHeartRate < 30 || avgHeartRate > 220) return res.status(400).send("Invalid heart rate (30-220)");

    const durationMinutes = parseInt(req.body.durationMinutes);

    if (isNaN(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) return res.status(400).send("Invalid duration (1-600 minutes)");

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

    const pauses = req.body.pauses || 0;
    const pauseLengthInMinutes = req.body.pauseLengthInMinutes || 0;

    if (isNaN(pauses) || pauses < 0 || pauses > 100) return res.status(400).send("Invalid number of pauses (0-100)");
    if (isNaN(pauseLengthInMinutes) || pauseLengthInMinutes < 0 || pauseLengthInMinutes > 60) return res.status(400).send("Invalid pause length (0-60 minutes)");

    const activeDuration = durationMinutes - pauses * pauseLengthInMinutes;

    let activeColoriesPerMinute = 0;

    if (avgHeartRate && durationMinutes) {

        if (!data || !weight) return res.status(404).send("User Not Found");

        const age = new Date().getFullYear() - data?.birthYear;

        if (data.gender === "male") {
            activeColoriesPerMinute = ((-55.0969 + (0.6309 * avgHeartRate) + (0.1988 * weight) + (0.2017 * age)) / 4.184)
        } else if (data.gender === "female") {
            activeColoriesPerMinute = ((-20.4022 + (0.4472 * avgHeartRate) - (0.1263 * weight) + (0.074 * age)) / 4.184)
        }
    }

    console.log("Active Calories Per Minute: %d", activeColoriesPerMinute);

    let passiveCaloriesPerMin = activeColoriesPerMinute * 0.5;

    burnedCalories = (activeColoriesPerMinute * activeDuration) + (passiveCaloriesPerMin * pauseLengthInMinutes * pauses);

    try {
        const training = await prisma.trainingLog.create({
            data: {
                userId: userId,
                type: req.body?.type,
                notes: req.body?.notes,
                avgHeartRate,
                durationMinutes,
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