import { Request, Response } from 'express';
import prisma from '../prisma/client';
import {getCurrentDate, getCurrentTime} from "../utility/date";

export const createTraining = async (req: Request, res: Response): Promise<any> => {

    if (!req.body || ! req.body.type) return res.status(400).send("Bad Request");

    const userId: string = (req as any).userId;

    if (!userId) return res.status(400).send("Bad Request");

    const {avgHeartRate, duration} = req.body;

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

    if (!data || !weight) return res.status(404).send("User Not Found");

    const age = new Date().getFullYear() - data.birthYear;

    if (avgHeartRate && duration) {
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
        return res.status(500).send("Internal Server Error");
    }
}

export const getTrainingLogs = async (req: Request, res: Response): Promise<any> => {
    const userId: string = (req as any).userId;

    if (!userId) return res.status(400).send("Bad Request");

    try {
        const trainingLogs = await prisma.trainingLog.findMany({
            where: { userId: userId },
            orderBy: { date: 'desc' },
            include:  { exercises: { include: { sets: true } } }
        });
        return res.status(200).json(trainingLogs);
    } catch (error) {
        return res.status(500).send("Internal Server Error");
    }
}

export const updateTraining = async (req: Request, res: Response): Promise<any> => {
    const userId: string = (req as any).userId;
    const trainingLogId: string = req.params.id;

    const { avgHeartRate, notes, duration } = req.body;

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
                caloriesBurned: burnedCalories
            }
        });
        return res.status(200).json(updatedTrainingLog);
    } catch (error) {
        return res.status(500).send("Internal Server Error");
    }
}

export const getTrainingLogById = async (req: Request, res: Response): Promise<any> => {
    const userId: string = (req as any).userId;
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
        return res.status(500).send("Internal Server Error");
    }
}

export const getTrainingLogsByDate = async (req: Request, res: Response): Promise<any> => {
    const userId: string = (req as any).userId;
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
        return res.status(500).send("Internal Server Error");
    }
}