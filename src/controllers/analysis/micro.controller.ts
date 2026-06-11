import {NextFunction, Response} from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import microService from "../../services/analysis/micro.service";
import {NUTRIENT_KEYS} from "../../utility/nutrientFields";

export const getMicroOverTime = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;

    const micro = req.params?.micro as string;

    if (!micro) return res.status(400).json({ error: 'Micro parameter is required' });

    if (NUTRIENT_KEYS.indexOf(micro as any) === -1) return res.status(400).json({ error: 'Invalid micro parameter' });

    let startDate: string | Date | undefined = req.query?.startDate as string;

    if (!startDate || isNaN(Date.parse(startDate))) {
        startDate = new Date(0);
    } else {
        startDate = new Date(startDate);
    }

    let endDate: string | Date | undefined = req.query?.endDate as string;

    if (!endDate || isNaN(Date.parse(endDate))) {
        endDate = new Date();
    } else {
        endDate = new Date(endDate);
    }

    res.status(200).send(await microService.getFoodLogsByMicro(userId, micro, startDate, endDate))
}