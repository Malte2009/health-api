import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const createExercise = async (req: Request, res: Response): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId: string = (req as any).userId;

    if (!userId) return res.status(401).send('Token missing');

    const { name, trainingId } = req.body;

    if (!name || !trainingId) return res.status(400).send("Bad Request");

    const training = await prisma.trainingLog.findUnique({where: { id: trainingId, userId: userId }});

    if (!training) return res.status(404).send("Training not found");

    try {
        const exercise = await prisma.exerciseLog.create({
            data: {
                trainingId,
                name
            }
        });
        return res.status(201).json(exercise);
    } catch (error) {
        return res.status(500).send("Internal Server Error");
    }
}