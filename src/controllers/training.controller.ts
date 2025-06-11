import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const createTraining = async (req: Request, res: Response): Promise<any> => {

    if (!req.body) return res.status(400).send("Bad Request");

    const userId: string = (req as any).userId;

    if (!userId) return res.status(400).send("Bad Request");

    try {
        const training = await prisma.trainingLog.create({
            data: {
                userId: userId,
                date: new Date(req.body?.date) || new Date(),
                notes: req.body?.notes,
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