import { NextFunction, Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import {getHoursSinceLastCaffeine} from "../../utility/caffeine";

export const getSleepLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    try {
        const sleepLogs = await prisma.sleepLog.findMany({
            where: { userId: userId },
            orderBy: { date: 'desc' },
            include: {
                hrvRecording: true
            }
        });
        return res.status(200).json(sleepLogs);
    } catch (error) {
        next(error);
    }
}

export const getSleepLogById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const sleepLogId = req.params.id as string;

    if (!sleepLogId) return res.status(400).send("Sleep log ID is required");

    try {
        const sleepLog = await prisma.sleepLog.findFirst({
            where: {
                id: sleepLogId,
                userId: userId
            },
            include: {
                hrvRecording: true
            }
        });

        if (!sleepLog) return res.status(404).send("Sleep log not found");

        return res.status(200).json(sleepLog);
    } catch (error) {
        next(error);
    }
}

export const createSleepLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId = req.userId;
    const {
        date, bedTime, wakeTime, sleepLatencyMinutes, wakeEpisodes, subjectiveHours, restedScore,
        morningHeadache, morningDizziness, totalSleepMinutes, awakeMinutes, lightSleepMinutes,
        deepSleepMinutes, remSleepMinutes, turningSpikeCount, turningSpikeMaxHr, notes, sleepType
    } = req.body;

    if (!date) return res.status(400).send("Date is required");

    try {

        let caffeine: number[] | null | null[] = await getHoursSinceLastCaffeine(bedTime, userId);

        if (!caffeine) caffeine = [null, null]

        const sleepLog = await prisma.sleepLog.create({
            data: {
                userId,
                date: new Date(date),
                sleepType,
                bedTime: bedTime ? new Date(bedTime) : undefined,
                wakeTime: wakeTime ? new Date(wakeTime) : undefined,
                sleepLatencyMinutes,
                wakeEpisodes,
                subjectiveHours,
                restedScore,
                morningHeadache,
                morningDizziness,
                totalSleepMinutes,
                awakeMinutes,
                lightSleepMinutes,
                deepSleepMinutes,
                remSleepMinutes,
                turningSpikeCount,
                turningSpikeMaxHr,
                notes,
                lastCaffeineAmountMg: caffeine[1],
                hoursSinceLastCaffeine: caffeine[0]
            }
        });
        return res.status(201).json(sleepLog);
    } catch (error) {
        next(error);
    }
}

export const updateSleepLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const sleepLogId = req.params.id as string;

    if (!req.body) return res.status(400).send("Bad Request");

    const {
        date, bedTime, wakeTime, sleepLatencyMinutes, wakeEpisodes, subjectiveHours, restedScore,
        morningHeadache, morningDizziness, totalSleepMinutes, awakeMinutes, lightSleepMinutes,
        deepSleepMinutes, remSleepMinutes, turningSpikeCount, turningSpikeMaxHr, notes, sleepType
    } = req.body;

    try {
        const sleepLog = await prisma.sleepLog.findUnique({
            where: { id: sleepLogId, userId: userId }
        });

        if (!sleepLog) return res.status(404).send("Sleep log not found");

        const updatedSleepLog = await prisma.sleepLog.update({
            where: { id: sleepLogId },
            data: {
                date: date ? new Date(date) : sleepLog.date,
                sleepType: sleepType !== undefined ? sleepType : sleepLog.sleepType,
                bedTime: bedTime !== undefined ? (bedTime ? new Date(bedTime) : null) : sleepLog.bedTime,
                wakeTime: wakeTime !== undefined ? (wakeTime ? new Date(wakeTime) : null) : sleepLog.wakeTime,
                sleepLatencyMinutes: sleepLatencyMinutes !== undefined ? sleepLatencyMinutes : sleepLog.sleepLatencyMinutes,
                wakeEpisodes: wakeEpisodes !== undefined ? wakeEpisodes : sleepLog.wakeEpisodes,
                subjectiveHours: subjectiveHours !== undefined ? subjectiveHours : sleepLog.subjectiveHours,
                restedScore: restedScore !== undefined ? restedScore : sleepLog.restedScore,
                morningHeadache: morningHeadache !== undefined ? morningHeadache : sleepLog.morningHeadache,
                morningDizziness: morningDizziness !== undefined ? morningDizziness : sleepLog.morningDizziness,
                totalSleepMinutes: totalSleepMinutes !== undefined ? totalSleepMinutes : sleepLog.totalSleepMinutes,
                awakeMinutes: awakeMinutes !== undefined ? awakeMinutes : sleepLog.awakeMinutes,
                lightSleepMinutes: lightSleepMinutes !== undefined ? lightSleepMinutes : sleepLog.lightSleepMinutes,
                deepSleepMinutes: deepSleepMinutes !== undefined ? deepSleepMinutes : sleepLog.deepSleepMinutes,
                remSleepMinutes: remSleepMinutes !== undefined ? remSleepMinutes : sleepLog.remSleepMinutes,
                turningSpikeCount: turningSpikeCount !== undefined ? turningSpikeCount : sleepLog.turningSpikeCount,
                turningSpikeMaxHr: turningSpikeMaxHr !== undefined ? turningSpikeMaxHr : sleepLog.turningSpikeMaxHr,
                notes: notes !== undefined ? notes : sleepLog.notes
            }
        });

        return res.status(200).json(updatedSleepLog);
    } catch (error) {
        next(error);
    }
}

export const deleteSleepLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const sleepLogId = req.params.id as string;

    if (!sleepLogId) return res.status(400).send("Sleep log ID is required");

    try {
        await prisma.sleepLog.deleteMany({
            where: {
                id: sleepLogId,
                userId: userId
            }
        });

        return res.status(200).send("Sleep log deleted successfully");
    } catch (error) {
        next(error);
    }
}
