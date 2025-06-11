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
