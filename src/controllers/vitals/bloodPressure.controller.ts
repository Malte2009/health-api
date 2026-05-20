import { NextFunction, Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const getBloodPressureLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;

    try {
        const bpLogs = await prisma.bloodPressureLog.findMany({
            where: { userId: userId },
            orderBy: { timestamp: 'desc' }
        });
        return res.status(200).json(bpLogs);
    } catch (error) {
        next(error);
    }
}

export const getBloodPressureLogById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const bpLogId = req.params.id as string;

    if (!bpLogId) return res.status(400).send("Blood pressure log ID is required");

    try {
        const bpLog = await prisma.bloodPressureLog.findFirst({
            where: {
                id: bpLogId,
                userId: userId
            }
        });

        if (!bpLog) return res.status(404).send("Blood pressure log not found");

        return res.status(200).json(bpLog);
    } catch (error) {
        next(error);
    }
}

export const createBloodPressureLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send("Bad Request");

    const userId = req.userId;
    const { timestamp, systolic, diastolic, pulse, position, context, minutesAfterPositionChange, symptoms, arm, trainingId } = req.body;

    if (!timestamp || systolic == null || diastolic == null) return res.status(400).send("Timestamp, systolic, and diastolic are required");

    try {
        const bpLog = await prisma.bloodPressureLog.create({
            data: {
                userId,
                timestamp: new Date(timestamp),
                systolic,
                diastolic,
                pulse,
                position,
                context,
                minutesAfterPositionChange,
                symptoms,
                arm,
                trainingId
            }
        });
        return res.status(201).json(bpLog);
    } catch (error) {
        next(error);
    }
}

export const updateBloodPressureLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const bpLogId = req.params.id as string;

    if (!req.body) return res.status(400).send("Bad Request");

    const { timestamp, systolic, diastolic, pulse, position, context, minutesAfterPositionChange, symptoms, arm, trainingId } = req.body;

    try {
        const bpLog = await prisma.bloodPressureLog.findUnique({
            where: { id: bpLogId, userId: userId }
        });

        if (!bpLog) return res.status(404).send("Blood pressure log not found");

        const updatedBpLog = await prisma.bloodPressureLog.update({
            where: { id: bpLogId },
            data: {
                timestamp: timestamp ? new Date(timestamp) : bpLog.timestamp,
                systolic: systolic ?? bpLog.systolic,
                diastolic: diastolic ?? bpLog.diastolic,
                pulse: pulse !== undefined ? pulse : bpLog.pulse,
                position: position !== undefined ? position : bpLog.position,
                context: context !== undefined ? context : bpLog.context,
                minutesAfterPositionChange: minutesAfterPositionChange !== undefined ? minutesAfterPositionChange : bpLog.minutesAfterPositionChange,
                symptoms: symptoms !== undefined ? symptoms : bpLog.symptoms,
                arm: arm !== undefined ? arm : bpLog.arm,
                trainingId: trainingId !== undefined ? trainingId : bpLog.trainingId
            }
        });

        return res.status(200).json(updatedBpLog);
    } catch (error) {
        next(error);
    }
}

export const deleteBloodPressureLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.userId;
    const bpLogId = req.params.id as string;

    if (!bpLogId) return res.status(400).send("Blood pressure log ID is required");

    try {
        await prisma.bloodPressureLog.deleteMany({
            where: {
                id: bpLogId,
                userId: userId
            }
        });

        return res.status(200).send("Blood pressure log deleted successfully");
    } catch (error) {
        next(error);
    }
}

