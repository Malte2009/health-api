import { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../prisma/client';

export const getSymptoms = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
        const symptoms = await prisma.symptomLog.findMany({
            where: { userId: req.userId },
            include: { pictures: true },
            orderBy: { timestamp: 'desc' }
        });
        return res.json(symptoms);
    } catch (error) {
        next(error);
    }
};

export const getSymptom = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { id } = req.params;
        const symptom = await prisma.symptomLog.findFirst({
            where: { id, userId: req.userId },
            include: { pictures: true }
        });
        if (!symptom) return res.status(404).send('Not Found');
        return res.json(symptom);
    } catch (error) {
        next(error);
    }
};

export const createSymptom = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
        req.body.type = req.body?.type.toUpperCase();

        const data = req.body;
        const symptom = await prisma.symptomLog.create({
            data: {
                ...data,
                userId: req.userId,
                // Make sure timestamp is valid
                timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
                onsetDateTime: data.onsetDateTime ? new Date(data.onsetDateTime) : undefined,
                offsetDateTime: data.offsetDateTime ? new Date(data.offsetDateTime) : undefined,
            }
        });
        return res.status(201).json(symptom);
    } catch (error) {
        next(error);
    }
};

export const updateSymptom = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { id } = req.params;
        const data = req.body;

        const existing = await prisma.symptomLog.findFirst({ where: { id, userId: req.userId }});
        if (!existing) return res.status(404).send('Not Found');

        const symptom = await prisma.symptomLog.update({
            where: { id },
            data: {
                ...data,
                timestamp: data.timestamp ? new Date(data.timestamp) : undefined,
                onsetDateTime: data.onsetDateTime ? new Date(data.onsetDateTime) : undefined,
                offsetDateTime: data.offsetDateTime ? new Date(data.offsetDateTime) : undefined,
            }
        });
        return res.json(symptom);
    } catch (error) {
        next(error);
    }
};

export const deleteSymptom = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { id } = req.params;
        const existing = await prisma.symptomLog.findFirst({ where: { id, userId: req.userId }});
        if (!existing) return res.status(404).send('Not Found');

        await prisma.symptomLog.delete({ where: { id } });
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
};

export const uploadSymptomPicture = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { id } = req.params;
        const file = req.file;

        const userId = req.userId;

        if (!file) return res.status(400).send('No file uploaded');

        const existing = await prisma.symptomLog.findFirst({ where: { id, userId: req.userId }});
        if (!existing) return res.status(404).send('Not Found');

        const picture = await prisma.symptomPicture.create({
            data: {
                userId,
                symptomId: id,
                filename: file.filename,
                filePath: `/images/${file.filename}`,
                mimetype: file.mimetype,
                size: file.size,
            }
        });

        return res.status(201).json(picture);
    } catch (error) {
        next(error);
    }
};

export const deleteSymptomPicture = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { id, pictureId } = req.params;
        const existing = await prisma.symptomLog.findFirst({ where: { id, userId: req.userId }});
        if (!existing) return res.status(404).send('Symptom Not Found');

        const picture = await prisma.symptomPicture.findFirst({ where: { id: pictureId, symptomId: id }});
        if (!picture) return res.status(404).send('Picture Not Found');

        await prisma.symptomPicture.delete({ where: { id: pictureId } });
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
};

