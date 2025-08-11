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
			let avgWeight = 0;
			let avgReps = 0;
			let count = 0;
			exercise.sets.forEach(set => {
				if (set.weight === null || set.reps === null || set.type === "Warmup") return;
				avgWeight += set.weight;
				avgReps += set.reps;
				count++;
			});

			let score = calculateScore(exercise.sets, { bodyweight: userWeight });

			if (count === 0) count = 1;

			avgWeight = roundTo(avgWeight / count, 1)
			avgReps = roundTo(avgReps / count, 1)

			filteredExercises.push({
				...exercise,
				avgWeight,
				avgReps,
				score: roundTo(score.score, 1),
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