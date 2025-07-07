import prisma from '../prisma/client';
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { Response, NextFunction } from 'express';
import { calculateExerciseScore } from '../utility/exerciseScore';


export const getExerciseScore = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
	const userId = req.userId;

	if (!userId) return res.status(401).send('Token missing');

	const exerciseId: string = req.body?.exerciseId;

	if (!exerciseId) {
		return res.status(400).send("Bad Request");
	}

	const exercise = await prisma.exerciseLog.findUnique({
		where: { id: exerciseId, userId }
	});

	if (!exercise) {
		return res.status(403).send("Access Denied");
	}

	const avgReps = exercise.avgReps;

	if (avgReps == null || avgReps < 1) {
		return res.status(400).send("Invalid average repetitions");
	}
	const avgWeight = exercise.avgWeight;
	if (avgWeight == null || avgWeight < 0) {
		return res.status(400).send("Invalid average weight");
	}
	const exerciseName = exercise.name;

	const exerciseScore = await calculateExerciseScore(avgReps, avgWeight, exerciseName, userId);

	return res.status(200).json({ score: exerciseScore });
}