import { Request, Response } from 'express';
import prisma from '../prisma/client';
import {getAge, getGender} from "../utility/userData";
import {getCurrentDate} from "../utility/date";

export const getCaloriesBurnedOnDay = async (req: Request, res: Response): Promise<any> => {
    const userId: string = (req as any).userId;

    if (!userId) return res.status(400).send("Bad Request");

    const date = req.query.date ?? getCurrentDate();

    try {
        const BMR = await prisma.bodyLog.findFirst({
            where: {userId: userId},
            orderBy: {date: 'desc'},
            select: {BMR: true}
        });

        if (!BMR || !BMR.BMR) return res.status(404).send("No body log found");

        const burnedCalories = await prisma.trainingLog.findMany({
            where: {
                userId,
                date
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
        console.error("Error fetching calories burned:", error);
        return res.status(500).send("Internal Server Error");
    }
}

export const createBodyLog = async (req: Request, res: Response): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId: string = (req as any).userId;

    const { weight, height, fatMass, fatPercentage, muscleMass, waterMass } = req.body;

    if (!userId || !weight || !height) return res.status(400).send("Bad Request");

    const BMI = weight / ((height / 100) * (height / 100));

    const age = await getAge(userId);
    const gender = await getGender(userId);

    let BMR;
    if (gender === "male") {
        BMR = 66.47 + (13.75 * weight) + (5.003 * height) - (6.755 * age)
    } else {
        BMR = 655.1 + (9.563 * weight) + (1.850 * height) - (4.676 * age);
    }

    let date;

    if (req.body?.date) {
        date = new Date(req.body.date)
    } else {
        date = new Date()
    }

    try {
        const bodyLog = await prisma.bodyLog.create({
            data: {
                userId: userId,
                date: date,
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
        console.error("Error creating body log:", error);
        return res.status(500).send("Internal Server Error");
    }
}