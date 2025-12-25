import { NextFunction, Response } from 'express';
import prisma from '../prisma/client';
import {getAge, getGender} from "../utility/userData";
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const getCaloriesBurnedOnDay = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    try {
        const BMR = await prisma.bodyLog.findFirst({
            where: {userId: userId},
            orderBy: {createdAt: 'desc'},
            select: {BMR: true}
        });

        if (!BMR || !BMR.BMR) return res.status(404).send("No body log found");

        const burnedCalories = await prisma.trainingLog.findMany({
            where: {
                userId
            },
            select: { caloriesBurned: true }
        });

        if (burnedCalories.length != 0) {
            const totalBurnedCalories = burnedCalories.reduce((acc, log) => acc + (log.caloriesBurned || 0), 0) + BMR.BMR;

            return res.status(200).send(totalBurnedCalories);
        } else {
            return res.status(200).send(BMR.BMR);
        }
    } catch (error) {
        next(error);
    }
}

export const getBodyLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    try {
        const bodyLogs = await prisma.bodyLog.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json(bodyLogs);
    } catch (error) {
        next(error);
    }
}

export const getBodyLogById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    const bodyLogId: string = req.params.id;

    if (!bodyLogId) return res.status(400).send("Body log ID is required");

    try {
        const bodyLog = await prisma.bodyLog.findFirst({
            where: {
                id: bodyLogId,
                userId: userId
            }
        });

        if (!bodyLog) return res.status(404).send("Body log not found");

        return res.status(200).json(bodyLog);
    } catch (error) {
        next(error);
    }
}

export const updateBodyLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const bodyLogId: string = req.params.id;
    let { weight, height, fatMass, fatPercentage, muscleMass, waterMass } = req.body;

    const bodyLog = await prisma.bodyLog.findUnique({
        where: { id: bodyLogId, userId: userId }
    });

    if (!bodyLog) return res.status(404).send("Body log Not Found");

    if (!weight && !height && !fatMass && !fatPercentage && !muscleMass && !waterMass) return res.status(400).send("Bad Request");

    if (weight == null && bodyLog.weight != null) weight = bodyLog.weight;
    if (height == null && bodyLog.height != null) height = bodyLog.height;
    if (fatMass == null && bodyLog.fatMass != null) fatMass = bodyLog.fatMass;
    if (fatPercentage == null && bodyLog.fatPercentage != null) fatPercentage = bodyLog.fatPercentage;
    if (muscleMass == null && bodyLog.muscleMass != null) muscleMass = bodyLog.muscleMass;
    if (waterMass == null && bodyLog.waterMass != null) waterMass = bodyLog.waterMass;

    const BMI = weight / ((height / 100) * (height / 100));

    const age = await getAge(userId);
    const gender = await getGender(userId);

    let BMR;

    if (gender === "male") {
        BMR = 66.47 + (13.75 * weight) + (5.003 * height) - (6.755 * age)
    } else {
        BMR = 655.1 + (9.563 * weight) + (1.850 * height) - (4.676 * age);
    }

    try {
        const updatedBodyLog = await prisma.bodyLog.update({
            where: { id: bodyLogId },
            data: {
                weight: weight,
                height: height,
                fatMass: fatMass,
                fatPercentage: fatPercentage,
                muscleMass: muscleMass,
                waterMass: waterMass,
                BMI: BMI,
                BMR: BMR
            }
        });

        return res.status(200).json(updatedBodyLog);
    } catch (error) {
        next(error);
    }
}

export const createBodyLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId = req.userId;
    const { weight, height, fatMass, fatPercentage, muscleMass, waterMass } = req.body;

    if (!weight || !height) return res.status(400).send("Bad Request");

    const BMI = weight / ((height / 100) * (height / 100));

    const age = await getAge(userId);
    const gender = await getGender(userId);

    let BMR;
    if (gender === "male") {
        BMR = 66.47 + (13.75 * weight) + (5.003 * height) - (6.755 * age)
    } else {
        BMR = 655.1 + (9.563 * weight) + (1.850 * height) - (4.676 * age);
    }

    try {
        const bodyLog = await prisma.bodyLog.create({
            data: {
                userId: userId,
                weight: weight,
                height: height,
                fatMass: fatMass,
                fatPercentage: fatPercentage,
                muscleMass: muscleMass,
                waterMass: waterMass,
                BMI: BMI,
                BMR: BMR
            }
        });
        return res.status(201).json(bodyLog);
    } catch (error) {
        next(error);
    }
}

export const deleteBodyLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    const bodyLogId: string = req.params.id;

    if (!bodyLogId) return res.status(400).send("Body log ID is required");

    try {
        await prisma.bodyLog.deleteMany({
            where: {
                id: bodyLogId,
                userId: userId
            }
        });

        return res.status(200).send("Body log deleted successfully");
    } catch (error) {
        next(error);
    }
}
