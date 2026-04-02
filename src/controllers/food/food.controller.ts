import { NextFunction, Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { PortionUnit } from '@prisma/client';

const isPositiveNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

const parsePortionUnit = (value: unknown): PortionUnit | undefined => {
    if (value == null) return undefined;
    if (value === PortionUnit.G || value === PortionUnit.ML) return value;
    return undefined;
};

const validateFatSplit = (fat_g: unknown, saturated_fat_g: unknown, unsaturated_fat_g: unknown): string | null => {
    if (typeof fat_g !== 'number' || !Number.isFinite(fat_g)) return null;

    const sat = typeof saturated_fat_g === 'number' && Number.isFinite(saturated_fat_g) ? saturated_fat_g : 0;
    const unsat = typeof unsaturated_fat_g === 'number' && Number.isFinite(unsaturated_fat_g) ? unsaturated_fat_g : 0;

    return null;
};

const getDefaultPortionData = (body: any): { data?: { defaultAmount?: number | null; defaultUnit?: PortionUnit | null; density_g_per_ml?: number | null }; error?: string } => {
    const hasDefaultAmount = Object.prototype.hasOwnProperty.call(body, 'defaultAmount');
    const hasDefaultUnit = Object.prototype.hasOwnProperty.call(body, 'defaultUnit');
    const hasDensity = Object.prototype.hasOwnProperty.call(body, 'density_g_per_ml');

    if (!hasDefaultAmount && !hasDefaultUnit && !hasDensity) return {};

    const defaultAmount = body.defaultAmount;
    const unit = parsePortionUnit(body.defaultUnit);
    const density = body.density_g_per_ml;

    if (hasDefaultUnit && body.defaultUnit != null && !unit) {
        return { error: 'defaultUnit must be one of: G, ML' };
    }

    if (hasDefaultAmount && defaultAmount != null && !isPositiveNumber(defaultAmount)) {
        return { error: 'defaultAmount must be a positive number' };
    }

    if (hasDensity && density != null && !isPositiveNumber(density)) {
        return { error: 'density_g_per_ml must be a positive number' };
    }

    const data: { defaultAmount?: number | null; defaultUnit?: PortionUnit | null; density_g_per_ml?: number | null } = {};

    if (hasDefaultAmount) data.defaultAmount = defaultAmount ?? null;
    if (hasDefaultUnit) data.defaultUnit = body.defaultUnit ?? null;
    if (hasDensity) data.density_g_per_ml = density ?? null;

    const nextAmount = hasDefaultAmount ? data.defaultAmount : undefined;
    const nextUnit = hasDefaultUnit ? data.defaultUnit : undefined;
    const nextDensity = hasDensity ? data.density_g_per_ml : undefined;

    const effectiveAmount = nextAmount === undefined ? body.defaultAmount : nextAmount;
    const effectiveUnit = nextUnit === undefined ? body.defaultUnit : nextUnit;
    const effectiveDensity = nextDensity === undefined ? body.density_g_per_ml : nextDensity;

    if ((effectiveAmount == null) !== (effectiveUnit == null)) {
        return { error: 'defaultAmount and defaultUnit must be provided together' };
    }

    if (effectiveUnit === PortionUnit.ML && effectiveAmount != null && effectiveDensity == null) {
        return { error: 'density_g_per_ml is required when defaultUnit is ML' };
    }

    if (effectiveUnit !== PortionUnit.ML && hasDensity && density != null) {
        return { error: 'density_g_per_ml can only be set when defaultUnit is ML' };
    }

    return { data };
};

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
        const fatSplitError = validateFatSplit(req.body.fat_g, req.body.saturated_fat_g, req.body.unsaturated_fat_g);
        if (fatSplitError) return res.status(400).send(fatSplitError);

        const defaultPortionResult = getDefaultPortionData(req.body);
        if (defaultPortionResult.error) return res.status(400).send(defaultPortionResult.error);

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
                sugar_g: req.body.sugar_g,
                saturated_fat_g: req.body.saturated_fat_g,
                unsaturated_fat_g: req.body.unsaturated_fat_g,
                salt_g: req.body.salt_g,
                ...defaultPortionResult.data,
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
                        caffeine:    req.body.nutrients.caffeine,
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

        const effectiveFat = req.body.fat_g ?? existing.fat_g;
        const effectiveSaturatedFat = req.body.saturated_fat_g ?? existing.saturated_fat_g;
        const effectiveUnsaturatedFat = req.body.unsaturated_fat_g ?? existing.unsaturated_fat_g;
        const fatSplitError = validateFatSplit(effectiveFat, effectiveSaturatedFat, effectiveUnsaturatedFat);
        if (fatSplitError) return res.status(400).send(fatSplitError);

        const defaultPortionResult = getDefaultPortionData({
            defaultAmount: Object.prototype.hasOwnProperty.call(req.body, 'defaultAmount') ? req.body.defaultAmount : existing.defaultAmount,
            defaultUnit: Object.prototype.hasOwnProperty.call(req.body, 'defaultUnit') ? req.body.defaultUnit : existing.defaultUnit,
            density_g_per_ml: Object.prototype.hasOwnProperty.call(req.body, 'density_g_per_ml') ? req.body.density_g_per_ml : existing.density_g_per_ml,
        });
        if (defaultPortionResult.error) return res.status(400).send(defaultPortionResult.error);

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
                sugar_g:           req.body.sugar_g,
                saturated_fat_g:   req.body.saturated_fat_g,
                unsaturated_fat_g: req.body.unsaturated_fat_g,
                salt_g:            req.body.salt_g,
                defaultAmount:     defaultPortionResult.data?.defaultAmount,
                defaultUnit:       defaultPortionResult.data?.defaultUnit,
                density_g_per_ml:  defaultPortionResult.data?.density_g_per_ml,
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
