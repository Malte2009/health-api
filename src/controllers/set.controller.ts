import { Request, Response } from 'express';
import prisma from '../prisma/client';
import {getCurrentDate, getCurrentTime} from "../utility/date";

export const createSet = async (req: Request, res: Response): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId: string = (req as any).userId;

    if (!userId) return res.status(401).send('Token missing');

    let { exerciseId, reps, weight, date, time } = req.body;

    if (!date || typeof date != "string") date = getCurrentDate()

    if (!time || typeof time != "string") time = getCurrentTime()

    if (!exerciseId || !reps || !weight) return res.status(400).send("Bad Request");

    try {
        const set = await prisma.setLog.create({
            data: {
                exerciseId,
                reps: parseInt(reps),
                weight : parseFloat(weight),
                date,
                time
            }
        });
        return res.status(201).json(set);
    } catch (error) {
        return res.status(500).send("Internal Server Error");
    }
}
