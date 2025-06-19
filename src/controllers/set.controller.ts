import { NextFunction, Request, Response } from 'express';
import prisma from '../prisma/client';
import {getCurrentDate, getCurrentTime} from "../utility/date";

export const changeSet = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId: string = (req as any).userId;

    if (!userId) return res.status(401).send('Token missing');

    const setId: string = req.params.id;

    if (!setId) return res.status(400).send("Bad Request");

    let { weight, reps, date, time } = req.body;

    if (!date || typeof date != "string") date = getCurrentDate()

    if (!time || typeof time != "string") time = getCurrentTime()

    if (!weight || !reps) return res.status(400).send("Bad Request");

    const set = await prisma.setLog.findUnique({where: { id: setId, userId: userId }});

    if (!set) return res.status(404).send("Set not found");

    const exercise = await prisma.exerciseLog.findFirst({
        where: { id: set.exerciseId, userId }
    });

    if (!exercise) return res.status(403).send("Access Denied");

    const parsedReps = parseInt(reps);

    if (isNaN(parsedReps) || parsedReps < 1 || parsedReps > 100) return res.status(400).send("Invalid reps (1-100)");

    const parsedWeight = parseFloat(weight);

    if (isNaN(parsedWeight) || parsedWeight < 0 || parsedWeight > 1000) return res.status(400).send("Invalid weight (0-1000 kg)");

    try {
        const updatedSet = await prisma.setLog.update({
            where: { id: setId },
            data: {
                weight: parsedWeight,
                reps: parsedReps,
                date,
                time
            }
        });
        return res.status(200).json(updatedSet);
    } catch (error) {
        next(error);
    }
}

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
                userId: userId,
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
