import { NextFunction, Response } from 'express';
import prisma from '../prisma/client';
import {AuthenticatedRequest} from "../middleware/auth.middleware";

export const getTrainingById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId
    const trainingLogId: string = req.params.id;

    if (!userId) return res.status(401).send("Unauthorized");

    if (!trainingLogId) return res.status(400).send("Bad Request");

    try {
        const trainingLog = await prisma.trainingLog.findUnique({
            where: { id: trainingLogId, userId: userId },
            include: { exercises: { include: { sets: {
                orderBy: [{ order: "asc" }, { createdAt: "asc" } ]
            } }, orderBy: {order: "asc"} } }
        });

        if (!trainingLog) return res.status(404).send("Training Log Not Found");

        return res.status(200).json(trainingLog);
    } catch (error) {
        next(error);
    }
}

export const getTraining = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    if (!userId) return res.status(401).send("Unauthorized");

    try {
        const trainingLogs = await prisma.trainingLog.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' },
            include:  { exercises: { include: { sets: true } } }
        });
        return res.status(200).json(trainingLogs);
    } catch (error) {
        next(error);
    }
}

export const getTrainingTypes = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    if (!userId) return res.status(401).send("Unauthorized");

    try {
        const trainingTypes = await prisma.trainingLog.findMany({
            where: { userId: userId },
            select: { type: true },
            distinct: ['type'],
            orderBy: { type: 'asc' }
        });
        return res.status(200).json(trainingTypes);
    } catch (error) {
        next(error);
    }
}

export const updateTraining = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const trainingLogId: string = req.params.id;

    if (!userId) return res.status(401).send("Unauthorized");

    let { notes, type, exercises, pauses, pauseLength } = req.body;

    console.log(req.body);

    let avgHeartRate = parseInt(req.body.avgHeartRate);
    let duration = parseInt(req.body.duration);

    const training = await prisma.trainingLog.findUnique({
        where: { id: trainingLogId, userId: userId },
        include: { exercises: { include: { sets: true } } }
    });

    if (!training) return res.status(404).send("Training Not Found");

    if (!type && !notes && !exercises && !avgHeartRate && !duration) return res.status(400).send("Bad Request");

    console.log(notes)

    if (notes == null && training.notes != null) notes = training.notes;
    if (type == null && training.type != null) type = training.type;
    if (exercises == null && training.exercises != null) exercises = training.exercises;
    if (avgHeartRate == null && training.avgHeartRate != null) avgHeartRate = training.avgHeartRate;
    if (duration == null && training.duration != null) duration = training.duration;
    if (pauses == null && training.pauses != null) pauses = training.pauses;
    if (pauseLength == null && training.pauseLength != null) pauseLength = training.pauseLength;

    //TODO: Validate exercises & sets

    const data = await prisma.user.findUnique({
        where: { id: userId },
        select: { gender: true, birthYear: true }
    });

    const weight = (await prisma.bodyLog.findFirst({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
        select: { weight: true }
    }))?.weight;

    let caloriesBurned = 0;

    if (data && weight) {
        const age = new Date().getFullYear() - data.birthYear;
        if (data.gender === "male") {
            caloriesBurned = ((-55.0969 + (0.6309 * avgHeartRate) + (0.1988 * weight) + (0.2017 * age)) / 4.184) * duration
        } else if (data.gender === "female") {
            caloriesBurned = ((-20.4022 + (0.4472 * avgHeartRate) - (0.1263 * weight) + (0.074 * age)) / 4.184) * duration
        }
    }

    try {
        const updatedTrainingLog = await prisma.trainingLog.update({
            where: { id: trainingLogId, userId: userId },
            data: {
                type: type,
                avgHeartRate: avgHeartRate,
                notes: notes || null,
                duration,
                caloriesBurned: Math.round(caloriesBurned * 100) / 100,
                exercises: {
                    update: exercises?.map((exercise: any) => ({
                        where: { id: exercise.id },
                        data: {
                            name: exercise.name,
                            order: exercise.order,
                            user: { connect: { id: userId } },
                            sets: {
                                update: exercise.sets
                                    .filter((set: any) => set.id) // Filter out sets with missing id
                                    .map((set: any) => ({
                                        where: { id: set.id },
                                        data: {
                                            reps: set.reps,
                                            weight: set.weight,
                                            order: set.order || 0,
                                            user: { connect: { id: userId } }
                                        }
                                    }))
                }}}))
                }
            },
            include: { exercises: { include: { sets: true } } }
        });
        return res.status(200).json(updatedTrainingLog);
    } catch (error) {
        next(error);
    }
}


export const createTraining = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    if (!userId) return res.status(401).send("Unauthorized");

    let { notes, type, pauses, pauseLength } = req.body;

    const avgHeartRate: number | null = req.body.avgHeartRate;
    const duration: number | null = req.body.duration;

    //Validate request body
    if (!req.body) return res.status(400).send("Bad Request");

    if (!type) return res.status(400).send("Training type is required");

    let burnedCalories = 0;

    const data = await prisma.user.findUnique({
        where: { id: userId },
        select: { gender: true, birthYear: true }
    })

    const weight = (await prisma.bodyLog.findFirst({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
        select: { weight: true }
    }))?.weight;

    if (avgHeartRate && duration && data && weight) {
        const age = new Date().getFullYear() - data?.birthYear;
        const activeDuration = duration - pauses * pauseLength;

        let activeCaloriesPerMinute = 0;

        if (data.gender === "male") {
            activeCaloriesPerMinute = ((-55.0969 + (0.6309 * avgHeartRate) + (0.1988 * weight) + (0.2017 * age)) / 4.184)
        } else if (data.gender === "female") {
            activeCaloriesPerMinute = ((-20.4022 + (0.4472 * avgHeartRate) - (0.1263 * weight) + (0.074 * age)) / 4.184)
        }

        let passiveCaloriesPerMin = activeCaloriesPerMinute * 0.7;

        burnedCalories = (activeCaloriesPerMinute * activeDuration) + (passiveCaloriesPerMin * pauseLength * pauses);
    }

    try {
        const training = await prisma.trainingLog.create({
            data: {
                userId: userId,
                type,
                notes,
                avgHeartRate,
                duration,
                caloriesBurned: Math.round(burnedCalories)
            }
        });
        return res.status(201).json(training);
    } catch (error) {
        next(error);
    }
}

export const deleteTraining = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const trainingLogId: string = req.params.id;

    if (!userId || !trainingLogId) return res.status(400).send("Bad Request");

    try {
        await prisma.trainingLog.delete({
            where: { id: trainingLogId, userId: userId }
        });

        return res.status(200).send("Training Log Deleted Successfully");
    } catch (error) {
        next(error);
    }
}