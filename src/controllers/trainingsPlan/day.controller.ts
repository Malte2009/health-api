import { NextFunction, Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const getDaysByTrainingPlanId = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
	const userId = req.userId;

	if (!userId) return res.status(401).send('Unauthorized');

	const trainingPlanId = req.params.trainingPlanId;

	if (!trainingPlanId) return res.status(400).send('Bad Request');

	try {
		const trainingPlan = await prisma.trainingPlan.findUnique({
			where: { id: trainingPlanId, userId: userId }
		});

		if (!trainingPlan) return res.status(404).send('Not Found');

		const days = await prisma.days.findMany({
			where: { trainingPlanId: trainingPlanId, userId: userId },
			include: { exercises: true }
		});

		return res.status(200).json(days);
	} catch (error) {
		next(error);
	}
};

export const createDay = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
	const userId = req.userId;

	if (!userId) return res.status(401).send('Unauthorized');

	if (!req.body) return res.status(400).send('Bad Request');

	const { trainingPlanId, dayOfWeek } = req.body;

	console.log(!dayOfWeek);

	if (!trainingPlanId || dayOfWeek == null) return res.status(400).send('Bad Request');

	try {
		const day = await prisma.days.create({
			data: {
				trainingPlanId: trainingPlanId,
				dayOfWeek: dayOfWeek,
				userId: userId
			}
		});

		return res.status(201).json(day);
	} catch (error) {
		next(error);
	}
};

export const addExerciseToDay = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
	const userId = req.userId;

	if (!userId) return res.status(401).send('Unauthorized');

	if (!req.body) return res.status(400).send('Bad Request');

	const { dayId, exercise } = req.body;

	if (!dayId || !exercise) return res.status(400).send('Bad Request');

	try {
		const updatedDay = await prisma.days.update({
			where: { id: dayId, userId: userId },
			data: {
				exercises: {
					create: {
						...exercise,
						userId: userId
					}
				}
			}
		});

		return res.status(200).json(updatedDay);
	} catch (error) {
		next(error);
	}
};

export const deleteExerciseFromDay = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
	const userId = req.userId;

	if (!userId) return res.status(401).send('Unauthorized');

	const { dayId, exerciseId } = req.params;

	if (!dayId || !exerciseId) return res.status(400).send('Bad Request');

	try {
		await prisma.days.update({
			where: { id: dayId, userId: userId },
			data: {
				exercises: {
					disconnect: { id: exerciseId }
				}
			}
		});

		return res.status(204).json();
	} catch (error) {
		next(error);
	}
};

export const deleteDay = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
	const userId = req.userId;

	if (!userId) return res.status(401).send('Unauthorized');

	const { id } = req.params;

	if (!id) return res.status(400).send('Bad Request');

	try {
		const deletedDay = await prisma.days.delete({
			where: { id: id, userId: userId }
		});

		return res.status(200).json(deletedDay);
	} catch (error) {
		next(error);
	}
};

export const deleteExercise = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
	const userId = req.userId;

	if (!userId) return res.status(401).send('Unauthorized');

	const { id } = req.params;

	if (!id) return res.status(400).send('Bad Request');

	try {
		await prisma.exercises.delete({
			where: { id: id, userId: userId }
		});

		return res.status(204).json();
	} catch (error) {
		next(error);
	}
};