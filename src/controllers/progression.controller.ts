import { NextFunction, Response } from 'express';
import prisma from '../prisma/client';
import {AuthenticatedRequest} from "../middleware/auth.middleware";
import { roundTo } from "../utility/math";
import { calculateScore } from "../utility/calculateScore";

export const getProgression = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
	const userId = req.userId;

	if (!userId) return res.status(401).send('Token missing');

	const exerciseName: string = req.params.name;

	try {
		const exercises = await prisma.exerciseLog.findMany({
			where: { userId: userId, name: exerciseName },
			include: {
				sets: {
					orderBy: { createdAt: 'asc' },
					select: {
						weight: true,
						reps: true,
						type: true,
						repUnit: true
					}
				}
			}
		});

		if (exercises.length === 0) return res.status(404).send("Exercise not found");

		let filteredExercises: any[] = [];

		let userWeight = (await prisma.bodyLog.findFirst({
			where: { userId: userId },
			orderBy: { createdAt: 'desc' },
			select: { weight: true }
		}))?.weight;

		if (!userWeight) userWeight = 0

		exercises.forEach(exercise => {
			let score;

			if (exercise.sets[0].repUnit === "s") {
				score = calculateScore(exercise.sets, { bodyweight: userWeight, capReps: 120 });
			} else {
				score = calculateScore(exercise.sets, { bodyweight: userWeight });
			}

			filteredExercises.push({
				...exercise,
				score: roundTo(score.score, 0),
			});
		});

		filteredExercises.sort((a, b) => {
			if (a.createdAt < b.createdAt) return 1;
			if (a.createdAt > b.createdAt) return -1;
			return 0;
		});

		return res.status(200).json(filteredExercises);
	} catch (error) {
		return next(error);
	}

}