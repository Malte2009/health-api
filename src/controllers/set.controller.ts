import { NextFunction, Request, Response } from 'express';
import prisma from '../prisma/client';
import {getCurrentDate, getCurrentTime} from "../utility/date";

export const changeSet = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId: string = (req as any).userId;

    if (!userId) return res.status(401).send('Token missing');

    const setId: string = req.params.id;

    if (!setId) return res.status(400).send("Bad Request");

    let { type, date, time } = req.body;

    if (!type || typeof type !== "string") return res.status(400).send("Invalid type");

    if (!date || typeof date != "string") date = getCurrentDate()

    if (!time || typeof time != "string") time = getCurrentTime()


    const reps = parseInt(req.body.reps);

    if (isNaN(reps) || reps < 1 || reps > 100) return res.status(400).send("Invalid reps (1-100)");

    const weight = parseFloat(req.body.weight);

    if (isNaN(weight) || weight < 0 || weight > 1000) return res.status(400).send("Invalid weight (0-1000 kg)");

    const set = await prisma.setLog.findUnique({where: { id: setId, userId: userId }});

    if (!set) return res.status(404).send("Set not found");

    const exercise = await prisma.exerciseLog.findFirst({
        where: { id: set.exerciseId, userId }
    });

    if (!exercise) return res.status(403).send("Access Denied");

    try {
        const updatedSet = await prisma.setLog.update({
            where: { id: setId },
            data: {
                type,
                weight,
                reps,
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

    let { type, exerciseId, date, time } = req.body;

    if (!type || typeof type !== "string") return res.status(400).send("Invalid type");

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
                type,
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


export const deleteSet = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const userId: string = (req as any).userId;

    if (!userId) return res.status(401).send('Token missing');

    const setId: string = req.params.id;

    if (!setId) return res.status(400).send("Bad Request");

    const set = await prisma.setLog.findUnique({where: { id: setId, userId: userId }});

    if (!set) return res.status(404).send("Set not found");

    const exercise = await prisma.exerciseLog.findFirst({
        where: { id: set.exerciseId, userId }
    });

    if (!exercise) return res.status(403).send("Access Denied");

    try {
        const deletedSet = await prisma.setLog.delete({
            where: { id: setId }
        });
        return res.status(200).json(deletedSet);
    } catch (error) {
        next(error);
    }
}