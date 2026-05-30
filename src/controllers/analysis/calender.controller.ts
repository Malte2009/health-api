import {NextFunction, Response} from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../prisma/client';
import { NUTRIENT_KEYS } from '../../utility/nutrientFields';

const round = (n: number, dec = 1) => Math.round(n * 10 ** dec) / 10 ** dec;

const fetchAndGroup = async (req: AuthenticatedRequest, res: Response, next: NextFunction, delegate: any, dateField: string, include?: any) => {
    const userId = req.userId;

    try {
        const startDate = new Date(req.query.start_date as string);
        const endDate = new Date(req.query.end_date as string);

        if (isNaN(startDate.getTime())) return res.status(400).json({ error: 'Invalid start_date format. Expected YYYY-MM-DD' });
        if (isNaN(endDate.getTime())) return res.status(400).json({ error: 'Invalid end_date format. Expected YYYY-MM-DD' });

        const whereClause = {
            userId: userId,
            [dateField]: {
                gte: startDate,
                lt: endDate
            }
        };

        const queryObj: any = { where: whereClause };
        if (include) {
            queryObj.include = include;
        }

        const data = await delegate.findMany(queryObj);

        const grouped: Record<string, any[]> = {};

        for (const log of data) {
            const dateObj = log[dateField];
            if (!dateObj) continue;
            const dateKey = dateObj.toISOString().split('T')[0];
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(log);
        }

        const result = Object.entries(grouped).map(([date, items]) => ({
            date,
            items
        }));

        return res.json(result);
    } catch (error) {
        next(error);
    }
};

export const getSymptomsOverMonth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => fetchAndGroup(req, res, next, prisma.symptomLog, 'timestamp');
export const getSyncopesOverMonth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => fetchAndGroup(req, res, next, prisma.syncopeLog, 'timestamp');
export const getBloodPressureOverMonth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => fetchAndGroup(req, res, next, prisma.bloodPressureLog, 'timestamp');
export const getSleepOverMonth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => fetchAndGroup(req, res, next, prisma.sleepLog, 'date');
export const getTrainingOverMonth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => fetchAndGroup(req, res, next, prisma.trainingLog, 'createdAt');
export const getDailyLogsOverMonth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => fetchAndGroup(req, res, next, prisma.dailyLog, 'date');
export const getIntakeLogsOverMonth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => fetchAndGroup(req, res, next, prisma.intakeLog, 'timestamp');

export const getMicroConsumptionOverMonth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    try {
        const startDate = new Date(req.query.start_date as string);
        const endDate = new Date(req.query.end_date as string);

        // Check if date is valid
        if (isNaN(startDate.getTime())) return res.status(400).json({ error: 'Invalid start_date format. Expected YYYY-MM-DD' });
        if (isNaN(endDate.getTime())) return res.status(400).json({ error: 'Invalid end_date format. Expected YYYY-MM-DD' });

        const data = await prisma.foodLog.findMany({
            where: {
                userId: userId,
                date: {
                    gte: new Date(startDate),
                    lt: new Date(endDate)
                }
            },
            include: {
                food: {
                    include: {
                        nutrients: true
                    }
                }
            }
        });

        const grouped: Record<string, Record<string, number>> = {};

        for (const log of data) {
            const dateKey = log.date.toISOString().split('T')[0];
            if (!grouped[dateKey]) {
                grouped[dateKey] = {};
            }

            const f = log.food;
            const fallbackWeight = f.defaultAmount == null
                ? null
                : f.defaultUnit === 'ML'
                    ? f.density_g_per_ml == null
                        ? null
                        : f.defaultAmount * f.density_g_per_ml
                    : f.defaultUnit === 'PORTION'
                        ? f.g_per_portion == null
                            ? null
                            : f.defaultAmount * f.g_per_portion
                    : f.defaultAmount;

            const grams = log.weight_g ?? fallbackWeight ?? 0;
            const factor = grams / 100;

            if (f.nutrients) {
                for (const key of NUTRIENT_KEYS) {
                    const val = (f.nutrients as any)[key];
                    if (val != null) {
                        grouped[dateKey][key] = (grouped[dateKey][key] ?? 0) + Number(val) * factor;
                    }
                }
            }
        }

        const result = Object.entries(grouped).map(([date, micros]) => {
            const roundedMicros = Object.fromEntries(
                Object.entries(micros).map(([k, v]) => [k, round(v, 2)])
            );
            return {
                date,
                ...roundedMicros
            };
        });

        return res.json(result);

    } catch (error) {
        next(error);
    }
};
