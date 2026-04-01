import { NextFunction, Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const getFoods = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;

    try {
        const foods = await prisma.food.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json(foods);
    } catch (error) {
        next(error);
    }
}

export const getMyFoods = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;

    try {
        const foods = await prisma.food.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json(foods);
    } catch (error) {
        next(error);
    }
}

export const searchFoods = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const q = req.query.q as string;

    if (!q || q.trim().length === 0) return res.status(400).send("Search query is required");

    try {
        const foods = await prisma.food.findMany({
            where: {
                userId,
                name: { contains: q.trim(), mode: 'insensitive' }
            },
            orderBy: { name: 'asc' }
        });
        return res.status(200).json(foods);
    } catch (error) {
        next(error);
    }
}

export const getFoodById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const foodId: string = req.params.id as string;

    if (!foodId) return res.status(400).send("Food ID is required");

    try {
        const food = await prisma.food.findUnique({
            where: { id: foodId, userId },
            include: { nutrients: true }
        });

        if (!food) return res.status(404).send("Food not found");

        return res.status(200).json(food);
    } catch (error) {
        next(error);
    }
}

export const createFood = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId = req.userId;

    try {
        const newFood = await prisma.food.create({
            include: { nutrients: true },
            data: {
                userId,
                name: req.body.name,
                calories_per_100g: req.body.calories_per_100g,
                protein_g: req.body.protein_g,
                carbs_g: req.body.carbs_g,
                fat_g: req.body.fat_g,
                fiber_g: req.body.fiber_g,
                nutrients: req.body.nutrients ? {
                    create: {
                        vitamin_a:   req.body.nutrients.vitamin_a,
                        vitamin_d:   req.body.nutrients.vitamin_d,
                        vitamin_e:   req.body.nutrients.vitamin_e,
                        vitamin_k:   req.body.nutrients.vitamin_k,
                        vitamin_c:   req.body.nutrients.vitamin_c,
                        vitamin_b1:  req.body.nutrients.vitamin_b1,
                        vitamin_b2:  req.body.nutrients.vitamin_b2,
                        vitamin_b3:  req.body.nutrients.vitamin_b3,
                        vitamin_b5:  req.body.nutrients.vitamin_b5,
                        vitamin_b6:  req.body.nutrients.vitamin_b6,
                        vitamin_b7:  req.body.nutrients.vitamin_b7,
                        vitamin_b9:  req.body.nutrients.vitamin_b9,
                        vitamin_b12: req.body.nutrients.vitamin_b12,
                        choline:     req.body.nutrients.choline,
                        calcium:     req.body.nutrients.calcium,
                        phosphorus:  req.body.nutrients.phosphorus,
                        magnesium:   req.body.nutrients.magnesium,
                        sodium:      req.body.nutrients.sodium,
                        potassium:   req.body.nutrients.potassium,
                        chloride:    req.body.nutrients.chloride,
                        sulfur:      req.body.nutrients.sulfur,
                        iron:        req.body.nutrients.iron,
                        zinc:        req.body.nutrients.zinc,
                        selenium:    req.body.nutrients.selenium,
                        iodine:      req.body.nutrients.iodine,
                        copper:      req.body.nutrients.copper,
                        manganese:   req.body.nutrients.manganese,
                        chromium:    req.body.nutrients.chromium,
                        molybdenum:  req.body.nutrients.molybdenum,
                        fluoride:    req.body.nutrients.fluoride,
                        omega_3:     req.body.nutrients.omega_3,
                        omega_6:     req.body.nutrients.omega_6,
                        omega_9:     req.body.nutrients.omega_9,
                    }
                } : undefined
            }
        })

        return res.status(201).json(newFood);
    } catch (error) {
        next(error);
    }
}

export const updateFood = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const foodId = req.params.id;

    if (!foodId) return res.status(400).send("Food ID is required");

    try {
        const existing = await prisma.food.findUnique({ where: { id: foodId, userId } });
        if (!existing) return res.status(404).send("Food not found");

        const updated = await prisma.food.update({
            where: { id: foodId },
            include: { nutrients: true },
            data: {
                name:              req.body.name,
                calories_per_100g: req.body.calories_per_100g,
                protein_g:         req.body.protein_g,
                carbs_g:           req.body.carbs_g,
                fat_g:             req.body.fat_g,
                fiber_g:           req.body.fiber_g,
            }
        });

        return res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
}

export const deleteFood = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const foodId = req.params.id;

    if (!foodId) return res.status(400).send("Food ID is required");

    try {
        const existing = await prisma.food.findUnique({ where: { id: foodId, userId } });
        if (!existing) return res.status(404).send("Food not found");

        await prisma.food.delete({ where: { id: foodId } });
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
}
