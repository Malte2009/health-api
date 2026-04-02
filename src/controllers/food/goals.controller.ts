import { NextFunction, Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const getGoals = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    try {
        const goals = await prisma.userGoals.findUnique({ where: { userId } });
        if (!goals) return res.status(404).send("No goals set");
        return res.status(200).json(goals);
    } catch (error) {
        next(error);
    }
}

export const createGoals = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    try {
        const existing = await prisma.userGoals.findUnique({ where: { userId } });
        if (existing) return res.status(409).send("Goals already exist, use PATCH to update");

        const goals = await prisma.userGoals.create({
            data: {
                userId,
                calories:          req.body.calories,
                protein_g:         req.body.protein_g,
                carbs_g:           req.body.carbs_g,
                fat_g:             req.body.fat_g,
                fiber_g:           req.body.fiber_g,
                sugar_g:           req.body.sugar_g,
                saturated_fat_g:   req.body.saturated_fat_g,
                unsaturated_fat_g: req.body.unsaturated_fat_g,
                salt_g:            req.body.salt_g,
            }
        });
        return res.status(201).json(goals);
    } catch (error) {
        next(error);
    }
}

export const updateGoals = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    try {
        const existing = await prisma.userGoals.findUnique({ where: { userId } });
        if (!existing) return res.status(404).send("No goals set, use POST to create");

        const updated = await prisma.userGoals.update({
            where: { userId },
            data: {
                calories:          req.body.calories,
                protein_g:         req.body.protein_g,
                carbs_g:           req.body.carbs_g,
                fat_g:             req.body.fat_g,
                fiber_g:           req.body.fiber_g,
                sugar_g:           req.body.sugar_g,
                saturated_fat_g:   req.body.saturated_fat_g,
                unsaturated_fat_g: req.body.unsaturated_fat_g,
                salt_g:            req.body.salt_g,
            }
        });
        return res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
}

export const deleteGoals = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    try {
        const existing = await prisma.userGoals.findUnique({ where: { userId } });
        if (!existing) return res.status(404).send("No goals set");

        await prisma.userGoals.delete({ where: { userId } });
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
}
