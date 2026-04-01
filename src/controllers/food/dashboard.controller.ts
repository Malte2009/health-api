import { NextFunction, Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { NUTRIENT_KEYS, NutrientKey } from '../../utility/nutrientFields';

const round = (n: number, dec = 1) => Math.round(n * 10 ** dec) / 10 ** dec;

const goalProgress = (target: number | null | undefined, achieved: number) => {
    if (target == null) return null;
    return {
        target,
        achieved: round(achieved),
        progress_percent: round((achieved / target) * 100),
    };
};

const buildDaySummary = async (userId: string, date: Date) => {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end   = new Date(date); end.setHours(23, 59, 59, 999);

    const [mealLogs, userGoals] = await Promise.all([
        prisma.mealLog.findMany({
            where: { userId, createdAt: { gte: start, lte: end } },
            include: {
                foodLogs: {
                    include: {
                        food: { include: { nutrients: true } }
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        }),
        prisma.userGoals.findUnique({ where: { userId } }),
    ]);

    let calories = 0, protein_g = 0, carbs_g = 0, fat_g = 0, fiber_g = 0;
    const nutrientTotals: Partial<Record<NutrientKey, number>> = {};

    for (const meal of mealLogs) {
        for (const fl of meal.foodLogs) {
            const factor = (fl.weight_g ?? 0) / 100;
            const f = fl.food;

            calories  += (f.calories_per_100g ?? 0) * factor;
            protein_g += (f.protein_g         ?? 0) * factor;
            carbs_g   += (f.carbs_g           ?? 0) * factor;
            fat_g     += (f.fat_g             ?? 0) * factor;
            fiber_g   += (f.fiber_g           ?? 0) * factor;

            if (f.nutrients) {
                for (const key of NUTRIENT_KEYS) {
                    const val = f.nutrients[key];
                    if (val != null) {
                        nutrientTotals[key] = (nutrientTotals[key] ?? 0) + Number(val) * factor;
                    }
                }
            }
        }
    }

    return {
        totals: {
            calories:  round(calories),
            protein_g: round(protein_g),
            carbs_g:   round(carbs_g),
            fat_g:     round(fat_g),
            fiber_g:   round(fiber_g),
        },
        nutrientTotals: Object.fromEntries(
            Object.entries(nutrientTotals).map(([k, v]) => [k, round(v as number, 2)])
        ),
        meals: mealLogs.map(m => ({
            id:    m.id,
            type:  m.type,
            foods: m.foodLogs,
        })),
        goals: {
            calories:  goalProgress(userGoals?.calories,  calories),
            protein_g: goalProgress(userGoals?.protein_g, protein_g),
            carbs_g:   goalProgress(userGoals?.carbs_g,   carbs_g),
            fat_g:     goalProgress(userGoals?.fat_g,     fat_g),
            fiber_g:   goalProgress(userGoals?.fiber_g,   fiber_g),
        },
    };
};

export const getDailySummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const { date } = req.query;

    const d = date ? new Date(date as string) : new Date();
    if (isNaN(d.getTime())) return res.status(400).send("Invalid date format");

    try {
        const summary = await buildDaySummary(userId!, d);
        return res.status(200).json({
            date: d.toISOString().split('T')[0],
            ...summary,
        });
    } catch (error) {
        next(error);
    }
}

export const getWeeklySummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const { startDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date();
    if (isNaN(start.getTime())) return res.status(400).send("Invalid startDate format");

    try {
        const days = await Promise.all(
            Array.from({ length: 7 }, (_, i) => {
                const d = new Date(start);
                d.setDate(d.getDate() + i);
                return buildDaySummary(userId!, d).then(s => ({
                    date: d.toISOString().split('T')[0],
                    ...s,
                }));
            })
        );
        return res.status(200).json(days);
    } catch (error) {
        next(error);
    }
}

export const getMonthlySummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const { month } = req.query;

    if (!month) return res.status(400).send("month is required (format: YYYY-MM)");
    if (!/^\d{4}-\d{2}$/.test(month as string)) return res.status(400).send("month must be in YYYY-MM format");

    const [year, mon] = (month as string).split('-').map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();

    try {
        const days = await Promise.all(
            Array.from({ length: daysInMonth }, (_, i) => {
                const d = new Date(year, mon - 1, i + 1);
                return buildDaySummary(userId!, d).then(s => ({
                    date: d.toISOString().split('T')[0],
                    ...s,
                }));
            })
        );
        return res.status(200).json(days);
    } catch (error) {
        next(error);
    }
}
