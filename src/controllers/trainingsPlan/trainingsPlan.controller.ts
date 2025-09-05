import { NextFunction, Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const getTrainingPlans = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    if (!userId) return res.status(401).send('Unauthorized');

    try {
        const trainingsPlan = await prisma.trainingsPlan.findMany({
            where: { userId: userId },
            include: { days: { include: { exercises: true } } }
        });

        return res.status(200).json(trainingsPlan);
    } catch (error) {
        next(error);
    }
};

export const getTrainingPlanById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const id = req.params.id;

    if (!userId) return res.status(401).send('Unauthorized');

	if (!id) return res.status(400).send('Bad Request');

    try {
        const trainingPlan = await prisma.trainingsPlan.findUnique({
            where: { id: id, userId: userId },
            include: { days: { include: { exercises: true } } }
        });

        if (!trainingPlan) return res.status(404).send('Training plan not found');

        return res.status(200).json(trainingPlan);
    } catch (error) {
        next(error);
    }
};

export const createTrainingPlan = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
	const userId = req.userId;

	if (!userId) return res.status(401).send('Unauthorized');

	if (!req.body) return res.status(400).send('Bad Request');

	const { name } = req.body;

	if (!name) return res.status(400).send('Bad Request');

	try {
		const newPlan = await prisma.trainingsPlan.create({
			data: {
				name: name,
				userId: userId
			},
			include: { days: { include: { exercises: true } } }
		});

		return res.status(201).json(newPlan);
	} catch (error) {
		next(error);
	}
};

export const updateTrainingPlan = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
	const userId = req.userId;

	if (!userId) return res.status(401).send('Unauthorized');

	const id = req.params.id;

	if (!id) return res.status(400).send('Bad Request');

	if (!req.body) return res.status(400).send('Bad Request');

	const name = req.body.name;

	try {
		const updatedPlan = await prisma.trainingsPlan.update({
			where: { id: id, userId: userId },
			data: {
				name: name
			}
		});

		return res.status(200).json(updatedPlan);
	} catch (error) {
		next(error);
	}
};

export const deleteTrainingPlan = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
	const userId = req.userId;
	const id = req.params.id;

	if (!userId) return res.status(401).send('Unauthorized');

	if (!id) return res.status(400).send('Bad Request');

	try {
		const deletedPlan = await prisma.trainingsPlan.deleteMany({
			where: { id: id, userId: userId }
		});

		if (!deletedPlan) return res.status(404).send('Training plan not found');

		return res.status(204).send();
	} catch (error) {
		next(error);
	}
};
