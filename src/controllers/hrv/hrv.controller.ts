import { Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../prisma/client';
import fs from "fs"
import path from "path";
import { Worker } from "worker_threads";

export const getHrvRecording = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;

    const includeWindows = req.query.includeWindows as unknown as boolean;

    try {
        const hrvRecording = await prisma.hrvRecording.findMany({
            where: { userId },
            include: {
                metrics: true,
                windows: includeWindows
            }
        })

        return res.status(200).json(hrvRecording);
    } catch (error) {
        console.error(error);
    }
}

export const getHrvRecordingById = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;

    const recordingId = req.params.id;

    const includeWindows = req.query.includeWindows as unknown as boolean;

    try {
        const hrvRecording = await prisma.hrvRecording.findUnique({
            where: {
                userId,
                id: recordingId
            },
            include: {
                metrics: true,
                windows: includeWindows
            }
        })

        return res.status(200).json(hrvRecording);
    } catch (error) {
        console.error(error);
    }
}

export const postHrvRecording = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;

    const rrdata = req.body;

    console.log(rrdata);
    const date = new Date(req.query.date as string) || Date.now().toLocaleString();

    const trainingLogId = req.query.trainingLogId as string;
    const sleepLogId = req.query.sleepingLogId as string;
    const context = req.query.context as string;
    const startTime = new Date(req.query.startTime as string);
    const endTime = new Date(req.query.endTime as string);
    const device = req.query.device as string;

    try {
        if (trainingLogId) {
            const trainingLog = await prisma.hrvRecording.findUnique({
                where : {
                    id: trainingLogId,
                    userId
                }
            })

            if (!trainingLog) {
                return res.status(404).send("Training not found");
            }
        }

        if (sleepLogId) {
            const sleepingLog = await prisma.hrvRecording.findUnique({
                where: {
                    id: sleepLogId,
                    userId
                }
            })

            if (!sleepingLog) {
                return res.status(404).send("Sleep not found");
            }
        }

        const hrvRecording = await prisma.hrvRecording.create({
            data: {
                date,
                userId,
                trainingLogId,
                sleepLogId,
                context,
                device,
                startDateTime: startTime,
                endDateTime: endTime
            }
        })

        fs.writeFileSync(`./rrdata/${hrvRecording.id}.txt`, rrdata);

        res.status(200).json(hrvRecording);

        const extension = __filename.endsWith('.ts') ? '.ts' : '.js';
        const workerPath = path.join(__dirname, `hrvWorker${extension}`);

        const worker = new Worker(workerPath, {
            workerData: { recordingId: hrvRecording.id, startDateTime: hrvRecording.startDateTime },
            execArgv: extension === '.ts' ? ['--require', 'ts-node/register'] : undefined
        });

        worker.on('error', (err) => console.error('Worker error:', err));
        worker.on('exit', (code) => {
            if (code !== 0) console.error(`Worker stopped with exit code ${code}`);
        });
    } catch (error) {
        console.error(error);

        return res.status(500).send("Internal Server Error");
    }
}

export const changeHrvRecording = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;

    let rrdata = req.body;
    let trainingLogId = req.query.trainingLogId as string;
    let sleepLogId = req.query.sleepLogId as string;
    let context = req.query.context as string;
    let startTime = new Date(req.query.startTime as string);
    let endTime = new Date(req.query.endTime as string);
    let device = req.query.device as string;

    try {
        const hrvRecording = await prisma.hrvRecording.findUnique({
            where: {
                id: req.params.id,
                userId
            }
        })

        if (!hrvRecording) return res.status(404).send("HRV Recording not found");

        let changeRRData = true;

        if (rrdata === null) changeRRData = false;
        if (trainingLogId == null) trainingLogId = hrvRecording.trainingLogId || "";
        if (sleepLogId == null) sleepLogId = hrvRecording.sleepLogId || "";
        if (context == null) context = hrvRecording.context || "";
        if (startTime == null) startTime = hrvRecording.startDateTime || new Date(0);
        if (endTime == null) endTime = hrvRecording.endDateTime || new Date(0);
        if (device == null) device = hrvRecording.device || "";

        const updatedHrvRecording = await prisma.hrvRecording.update({
            where: { id: req.params.id },
            data: {
                trainingLogId,
                sleepLogId,
                context,
                startDateTime: startTime,
                endDateTime: endTime,
                device
            }
        })

        if (changeRRData) {
            fs.writeFileSync(`./rrdata/${updatedHrvRecording.id}.txt`, rrdata);

            res.status(200).json(hrvRecording);

            const extension = __filename.endsWith('.ts') ? '.ts' : '.js';
            const workerPath = path.join(__dirname, `hrvWorker${extension}`);

            const worker = new Worker(workerPath, {
                workerData: { recordingId: hrvRecording.id, startDateTime: hrvRecording.startDateTime },
                execArgv: extension === '.ts' ? ['--require', 'ts-node/register'] : undefined
            });

            worker.on('error', (err) => console.error('Worker error:', err));
            worker.on('exit', (code) => {
                if (code !== 0) console.error(`Worker stopped with exit code ${code}`);
            });
        }
    } catch (error) {
        console.error(error);
    }
}

export const deleteHrvRecording = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;

    const recordingId = req.params.id;

    try {
        const hrvRecording = await prisma.hrvRecording.findUnique({
            where: {
                id: recordingId,
                userId
            }
        })

        if (!hrvRecording) return res.status(404).send("HRV Recording not found");

        await prisma.hrvRecording.delete({
            where: { id: recordingId }
        })

        return res.status(200).send("Successfully deleted HRV Recording");
    } catch (error) {
        console.error(error);
    }
}