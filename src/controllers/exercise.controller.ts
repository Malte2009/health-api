import { NextFunction, Request, Response } from 'express';
import prisma from '../prisma/client';
import {getCurrentDate, getCurrentTime} from "../utility/date";

export const createExercise = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId: string = (req as any).userId;

    if (!userId) return res.status(401).send('Token missing');

    let { name, trainingId, date, time } = req.body;

    if (!date || typeof date != "string") date = getCurrentDate()

    if (!time || typeof time != "string") time = getCurrentTime()

    if (!name || !trainingId) return res.status(400).send("Bad Request");

    const training = await prisma.trainingLog.findUnique({where: { id: trainingId, userId: userId }});

    if (!training) return res.status(404).send("Training not found");

    try {
        const exercise = await prisma.exerciseLog.create({
            data: {
                trainingId,
                userId,
                name,
                date,
                time
            }
        });
        return res.status(201).json(exercise);
    } catch (error) {
        next(error);
    }
}