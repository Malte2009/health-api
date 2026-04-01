import { NextFunction, Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { extractNutrientFields } from '../../utility/nutrientFields';

export const getNutrients = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const foodId = req.params.foodId;

    try {
        const food = await prisma.food.findUnique({ where: { id: foodId, userId } });
        if (!food) return res.status(404).send("Food not found");

        const nutrients = await prisma.nutrientFacts.findUnique({ where: { foodId } });
        if (!nutrients) return res.status(404).send("Nutrients not found");

        return res.status(200).json(nutrients);
    } catch (error) {
        next(error);
    }
}

export const createNutrients = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const foodId = req.params.foodId;

    try {
        const food = await prisma.food.findUnique({ where: { id: foodId, userId } });
        if (!food) return res.status(404).send("Food not found");

        const existing = await prisma.nutrientFacts.findUnique({ where: { foodId } });
        if (existing) return res.status(409).send("Nutrients already exist for this food");

        const nutrients = await prisma.nutrientFacts.create({
            data: { foodId, ...extractNutrientFields(req.body) }
        });

        return res.status(201).json(nutrients);
    } catch (error) {
        next(error);
    }
}

export const updateNutrients = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const foodId = req.params.foodId;

    try {
        const food = await prisma.food.findUnique({ where: { id: foodId, userId } });
        if (!food) return res.status(404).send("Food not found");

        const existing = await prisma.nutrientFacts.findUnique({ where: { foodId } });
        if (!existing) return res.status(404).send("Nutrients not found");

        const updated = await prisma.nutrientFacts.update({
            where: { foodId },
            data: extractNutrientFields(req.body)
        });

        return res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
}

export const deleteNutrients = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const foodId = req.params.foodId;

    try {
        const food = await prisma.food.findUnique({ where: { id: foodId, userId } });
        if (!food) return res.status(404).send("Food not found");

        const existing = await prisma.nutrientFacts.findUnique({ where: { foodId } });
        if (!existing) return res.status(404).send("Nutrients not found");

        await prisma.nutrientFacts.delete({ where: { foodId } });
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
}
