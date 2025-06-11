import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const createSet = async (req: Request, res: Response): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId: string = (req as any).userId;

    if (!userId) return res.status(401).send('Token missing');

    const { exerciseId, reps, weight } = req.body;

    if (!exerciseId || !reps || !weight) return res.status(400).send("Bad Request");

    try {
        const set = await prisma.setLog.create({
            data: {
                exerciseId,
                reps: parseInt(reps),
                weight : parseFloat(weight)
            }
        });
        return res.status(201).json(set);
    } catch (error) {
        return res.status(500).send("Internal Server Error");
    }
}
