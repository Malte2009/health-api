import { NextFunction, Request, Response } from 'express';
import prisma from '../prisma/client';
import {getCurrentDate, getCurrentTime} from "../utility/date";

export const createSet = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId: string = (req as any).userId;

    if (!userId) return res.status(401).send('Token missing');

    let { exerciseId, date, time } = req.body;

    const reps = parseInt(req.body.reps);

    if (isNaN(reps) || reps < 1 || reps > 100) return res.status(400).send("Invalid reps (1-100)");

    const weight = parseFloat(req.body.weight);

    if (isNaN(weight) || weight < 0 || weight > 1000) return res.status(400).send("Invalid weight (0-1000 kg)");



    const exercise = await prisma.exerciseLog.findFirst({
        where: { id: exerciseId, userId }
    });

    if (!exercise) return res.status(403).send("Access Denied");

    if (!date || typeof date != "string") date = getCurrentDate()

    if (!time || typeof time != "string") time = getCurrentTime()

    if (!exerciseId || !reps || !weight) return res.status(400).send("Bad Request");

    try {
        const set = await prisma.setLog.create({
            data: {
                exerciseId,
                reps: reps,
                weight : weight,
                date,
                time
            }
        });
        return res.status(201).json(set);
    } catch (error) {
        next(error);
    }
}
