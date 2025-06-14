import { NextFunction, Request, Response } from 'express';
import prisma from '../prisma/client';
import {getCurrentDate, getCurrentTime} from "../utility/date";
import {AuthenticatedRequest} from "../middleware/auth.middleware";

export const createTraining = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {

    if (!req.body || ! req.body.type) return res.status(400).send("Bad Request");

    const userId = req.userId;

    if (!userId) return res.status(400).send("Bad Request");

    const date = req.body?.date?.toString() ?? getCurrentDate();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });

    const avgHeartRate = parseInt(req.body.avgHeartRate);

    if (isNaN(avgHeartRate) || avgHeartRate < 30 || avgHeartRate > 220) return res.status(400).send("Invalid heart rate (30-220)");

    const duration = parseInt(req.body.duration);

    if (isNaN(duration) || duration < 1 || duration > 600) return res.status(400).send("Invalid duration (1-600 minutes)");

    let burnedCalories = 0;

    const data = await prisma.user.findUnique({
        where: { id: userId },
        select: { gender: true, birthYear: true }
    })

    const weight = (await prisma.bodyLog.findFirst({
        where: { userId: userId, date: { lte: new Date() } },
        orderBy: { date: 'desc' },
        select: { weight: true }
    }))?.weight;

    if (avgHeartRate && duration) {

        if (!data || !weight) return res.status(404).send("User Not Found");

        const age = new Date().getFullYear() - data?.birthYear;

        if (data.gender === "male") {
            burnedCalories = ((-55.0969 + (0.6309 * avgHeartRate) + (0.1988 * weight) + (0.2017 * age)) / 4.184) * duration
        } else if (data.gender === "female") {
            burnedCalories = ((-20.4022 + (0.4472 * avgHeartRate) - (0.1263 * weight) + (0.074 * age)) / 4.184) * duration
        }
    }

    try {
        const training = await prisma.trainingLog.create({
            data: {
                userId: userId,
                date: req.body?.date ?? getCurrentDate(),
                time: req.body?.time ?? getCurrentTime(),
                type: req.body?.type,
                notes: req.body?.notes,
                avgHeartRate,
                durationMinutes: duration,
                caloriesBurned: burnedCalories
            }
        });
        return res.status(201).json(training);
    } catch (error) {
        next(error);
    }
}

export const getTrainingLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    if (!userId) return res.status(400).send("Bad Request");

    try {
        const trainingLogs = await prisma.trainingLog.findMany({
            where: { userId: userId },
            orderBy: { date: 'desc' },
            include:  { exercises: { include: { sets: true } } }
        });
        return res.status(200).json(trainingLogs);
    } catch (error) {
        next(error);
    }
}

export const updateTraining = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const trainingLogId: string = req.params.id;

    const notes = req.body.notes

    const avgHeartRate = parseInt(req.body.avgHeartRate);

    if (isNaN(avgHeartRate) || avgHeartRate < 30 || avgHeartRate > 220) return res.status(400).send("Invalid heart rate (30-220)");

    const duration = parseInt(req.body.duration);

    if (isNaN(duration) || duration < 1 || duration > 600) return res.status(400).send("Invalid duration (1-600 minutes)");

    if (!userId || !trainingLogId || !avgHeartRate || !duration) return res.status(400).send("Bad Request");

    const data = await prisma.user.findUnique({
        where: { id: userId },
        select: { gender: true, birthYear: true }
    })

    const weight = (await prisma.bodyLog.findFirst({
        where: { userId: userId, date: { lte: new Date() } },
        orderBy: { date: 'desc' },
        select: { weight: true }
    }))?.weight;

    if (!data || !weight) return res.status(404).send("User Not Found");

    const age = new Date().getFullYear() - data.birthYear;

    let burnedCalories = 0;

    if (data.gender === "male") {
        burnedCalories = ((-55.0969 + (0.6309 * avgHeartRate) + (0.1988 * weight) + (0.2017 * age)) / 4.184) * duration
    } else if (data.gender === "female") {
        burnedCalories = ((-20.4022 + (0.4472 * avgHeartRate) - (0.1263 * weight) + (0.074 * age)) / 4.184) * duration
    }

    try {
        const updatedTrainingLog = await prisma.trainingLog.update({
            where: { id: trainingLogId, userId: userId },
            data: {
                avgHeartRate: avgHeartRate,	
                notes: notes || null,
                durationMinutes: duration,
                caloriesBurned: Math.round(burnedCalories * 100) / 100
            }
        });
        return res.status(200).json(updatedTrainingLog);
    } catch (error) {
        next(error);
    }
}

export const getTrainingLogById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId
    const trainingLogId: string = req.params.id;

    if (!userId || !trainingLogId) return res.status(400).send("Bad Request");

    try {
        const trainingLog = await prisma.trainingLog.findUnique({
            where: { id: trainingLogId, userId: userId },
            include: { exercises: { include: { sets: true } } }
        });

        if (!trainingLog) return res.status(404).send("Training Log Not Found");

        return res.status(200).json(trainingLog);
    } catch (error) {
        next(error);
    }
}

export const getTrainingLogsByDate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const date: string = req.query.date?.toString() ?? getCurrentDate();

    if (!userId) return res.status(400).send("Bad Request");

    try {
        const trainingLogs = await prisma.trainingLog.findMany({
            where: { userId: userId, date: date },
            orderBy: { date: 'desc' },
            include: { exercises: { include: { sets: true } } }
        });

        return res.status(200).json(trainingLogs);
    } catch (error) {
        next(error);
    }
}