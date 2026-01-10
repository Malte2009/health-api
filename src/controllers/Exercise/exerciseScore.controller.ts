import { NextFunction, Response } from 'express';
import prisma from '../../prisma/client';
import {AuthenticatedRequest} from "../../middleware/auth.middleware";


export const getExerciseScoresByName = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const exerciseName: string = req.params.name;

    if (!exerciseName) return res.status(400).send("Exercise name is required");

    try {
        const exerciseScores = await prisma.exerciseLog.findMany({
            where: {
                userId: userId,
                name: exerciseName
            },
            select: {
                score: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        return res.status(200).json(exerciseScores);
    } catch (error) {
    next(error);
    }
}