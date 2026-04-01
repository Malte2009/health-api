import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { NRV, NrvKey } from '../../utility/nrv';
import { NUTRIENT_KEYS } from '../../utility/nutrientFields';

export const getNRV = (_req: AuthenticatedRequest, res: Response) => {
    return res.status(200).json(NRV);
}

export const getNRVProgress = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const nutrientTotals = req.body.nutrientTotals as Record<string, number>;

    if (!nutrientTotals || typeof nutrientTotals !== 'object') {
        return res.status(400).send("nutrientTotals object is required in body");
    }

    const progress: Record<string, { nrv: number; achieved: number; progress_percent: number }> = {};

    for (const key of NUTRIENT_KEYS) {
        const nrvValue = NRV[key as NrvKey];
        if (nrvValue == null) continue;

        const achieved = nutrientTotals[key] ?? 0;
        progress[key] = {
            nrv: nrvValue,
            achieved: Math.round(achieved * 100) / 100,
            progress_percent: Math.round((achieved / nrvValue) * 1000) / 10,
        };
    }

    return res.status(200).json(progress);
}
