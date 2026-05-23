import { Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../prisma/client';
import { applyFiltersToData, calculateMetricsForFilterSet, parseData } from '../../utility/calculateHrvMetrics';
import fs from "fs"
import path from "path";
import { Worker } from "worker_threads";

function preFilterRRData(rawData: string): string {
    if (!rawData) return "";
    const lines = rawData.split(/\r?\n/);
    const filteredLines = [];
    for (const line of lines) {
        if (!line.trim()) continue;
        const normalizedLine = line.replace(',', '.');
        const num = parseFloat(normalizedLine);
        if (isNaN(num)) continue;
        if (num <= 100) continue;
        filteredLines.push(num.toString());
    }
    return filteredLines.join('\n');
}

function parseRrFilterFlags(raw: unknown) {
    if (!raw || typeof raw !== 'string') return null;
    const value = raw.toLowerCase().trim();
    if (!value || value === 'none') {
        return { adaptive: false, range: false, movingAverage: false, artifact: false };
    }
    if (value === 'standard') {
        return { adaptive: false, range: true, movingAverage: true, artifact: true };
    }
    if (value === 'all') {
        return { adaptive: true, range: true, movingAverage: true, artifact: true };
    }

    const tokens = value.split(',').map(t => t.trim()).filter(Boolean);
    const has = (name: string) => tokens.includes(name);
    return {
        adaptive: has('adaptive'),
        range: has('range'),
        movingAverage: has('movingaverage') || has('moving_average') || has('moving-average') || has('movingavg'),
        artifact: has('artifact')
    };
}

function runMetricsWorker(recordingId: string, filters: { adaptive: boolean; range: boolean; movingAverage: boolean; artifact: boolean }) {
    const extension = __filename.endsWith('.ts') ? '.ts' : '.js';
    const workerPath = path.join(__dirname, `hrvMetricsWorker${extension}`);

    return new Promise((resolve, reject) => {
        const worker = new Worker(workerPath, {
            workerData: { recordingId, filters },
            execArgv: extension === '.ts' ? ['--require', 'ts-node/register'] : undefined
        });

        worker.on('message', (message) => {
            if (message?.error) {
                reject(new Error(message.error));
            } else {
                resolve(message?.metrics ?? message);
            }
        });
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
}

export const getHrvRecording = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;

    const includeWindows = req.query.includeWindows as unknown as boolean;

    try {
        const hrvRecording = await prisma.hrvRecording.findMany({
            where: { userId },
            include: {
                metrics: true,
                windows: includeWindows,
                sleepLog: true
            },
            orderBy: { date: 'desc' }
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
                windows: includeWindows,
                sleepLog: true
            }
        })

        return res.status(200).json(hrvRecording);
    } catch (error) {
        console.error(error);
    }
}

export const getHrvData = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    const recordingId = req.params.id;

    try {
        const hrvRecording = await prisma.hrvRecording.findUnique({
            where: {
                id: recordingId,
                userId
            }
        });

        if (!hrvRecording) {
            return res.status(404).send("HRV Recording not found");
        }

        const filePath = path.join(process.cwd(), 'rrdata', `${recordingId}.txt`);
        if (!fs.existsSync(filePath)) {
            return res.status(404).send("RR Data file not found.");
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split(/\r?\n/);
        let rawData: number[] = [];
        for (const line of lines) {
            if (!line.trim()) continue;
            const num = parseFloat(line.replace(',', '.'));
            if (!isNaN(num)) {
                rawData.push(num);
            }
        }

        if (rawData.length > 0) {
            const sorted = [...rawData].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
            if (median > 3000) {
                rawData = rawData.map(val => val / 1000);
            }
        }

        const filters = parseRrFilterFlags(req.query.filters);
        if (filters) {
            rawData = applyFiltersToData(rawData, filters);
        }

        return res.status(200).send(rawData.join('\n'));
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
}

export const getHrvWindowData = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    const windowId = req.params.id;

    try {
        const hrvWindow = await prisma.hrvWindow.findUnique({
            where: { id: windowId },
            include: { recording: true }
        });

        if (!hrvWindow || hrvWindow.recording.userId !== userId) {
            return res.status(404).send("HRV Window not found");
        }

        const recordingId = hrvWindow.recordingId;
        const filePath = path.join(process.cwd(), 'rrdata', `${recordingId}.txt`);
        if (!fs.existsSync(filePath)) {
            return res.status(404).send("RR Data file not found.");
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split(/\r?\n/);
        let rawData: number[] = [];
        for (const line of lines) {
            if (!line.trim()) continue;
            const num = parseFloat(line.replace(',', '.'));
            if (!isNaN(num)) {
                rawData.push(num);
            }
        }

        if (rawData.length > 0) {
            const sorted = [...rawData].sort((a,b)=>a-b);
            const mid = Math.floor(sorted.length/2);
            const median = sorted.length % 2 === 0 ? (sorted[mid-1]+sorted[mid])/2 : sorted[mid];
            if (median > 3000) {
                rawData = rawData.map(val => val / 1000);
            }
        }

        const timeMs = [0];
        for (let i = 1; i < rawData.length; i++) {
            timeMs.push(timeMs[i-1] + rawData[i-1]);
        }

        const recStart = hrvWindow.recording.startDateTime?.getTime() || 0;
        const targetStart = hrvWindow.windowStart.getTime();
        const targetEnd = targetStart + (hrvWindow.durationSeconds * 1000);

        const resultData: number[] = [];
        for (let i = 0; i < rawData.length; i++) {
            const currentTime = recStart + timeMs[i];
            if (currentTime >= targetStart && currentTime <= targetEnd) {
                resultData.push(rawData[i]);
            }
        }

        const filters = parseRrFilterFlags(req.query.filters);
        const filteredData = filters ? applyFiltersToData(resultData, filters) : resultData;

        return res.status(200).send(filteredData.join('\n'));
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
}

export const getHrvMetricsForRecording = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    const recordingId = req.params.id;
    const filters = parseRrFilterFlags(req.query.filters);

    if (!filters) {
        return res.status(400).send("Missing or invalid filters query");
    }

    try {
        const hrvRecording = await prisma.hrvRecording.findUnique({
            where: {
                id: recordingId,
                userId
            }
        });

        if (!hrvRecording) {
            return res.status(404).send("HRV Recording not found");
        }

        const existing = await prisma.hrvMetrics.findFirst({
            where: {
                hrvRecordingId: recordingId,
                hrvWindowId: null,
                adaptiveFilteringApplied: filters.adaptive,
                rangeFilteringApplied: filters.range,
                artifactFilteringApplied: filters.artifact,
                movingAverageFilteringApplied: filters.movingAverage
            }
        });

        if (existing) {
            return res.status(200).json(existing);
        }

        const metrics = await runMetricsWorker(recordingId, filters);
        return res.status(200).json(metrics);
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
}

export const postHrvRecording = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;

     let rrdata = req.body;
     if (typeof rrdata === 'string') {
         rrdata = preFilterRRData(rrdata);
     }

    const date = new Date(req.query.date as string) || Date.now().toLocaleString();

    let trainingLogId: string | null = req.query.trainingLogId as string;
    let sleepLogId: string | null = req.query.sleepingLogId as string;
    const context = req.query.context as string;
    const startTime = new Date(req.query.startTime as string);
    const endTime = new Date(req.query.endTime as string);
    const device = req.query.device as string;
    const name = req.query.name as string;

    if (!trainingLogId) trainingLogId = null
    if (!sleepLogId) sleepLogId = null

    try {
        if (trainingLogId) {
            const trainingLog = await prisma.trainingLog.findUnique({
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
            const sleepingLog = await prisma.sleepLog.findUnique({
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
                endDateTime: endTime,
                name
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
    let name = req.query.name as string;
    let date = req.query.date as unknown as Date;

    try {
        const hrvRecording = await prisma.hrvRecording.findUnique({
            where: {
                id: req.params.id,
                userId
            }
        })

        if (!hrvRecording) return res.status(404).send("HRV Recording not found");

        let changeRRData = true;

         if (rrdata === null || rrdata === undefined || rrdata === "") changeRRData = false;
         if (changeRRData && typeof rrdata === 'string') {
             rrdata = preFilterRRData(rrdata);
         }

        if (trainingLogId === undefined) trainingLogId = hrvRecording.trainingLogId || "";
        if (sleepLogId === undefined) sleepLogId = hrvRecording.sleepLogId || "";
        if (context === undefined) context = hrvRecording.context || "";
        if (startTime == null || isNaN(startTime.getTime())) startTime = hrvRecording.startDateTime || new Date(0);
        if (endTime == null || isNaN(endTime.getTime())) endTime = hrvRecording.endDateTime || new Date(0);
        if (device === undefined) device = hrvRecording.device || "";
        if (name === undefined) name = hrvRecording.name || "";
        if (date === undefined) date = hrvRecording.date || "";

        const trainingLogIdVal = trainingLogId === "" ? null : trainingLogId;
        const sleepLogIdVal = sleepLogId === "" ? null : sleepLogId;

        const updatedHrvRecording = await prisma.hrvRecording.update({
            where: { id: req.params.id },
            data: {
                trainingLogId: trainingLogIdVal,
                sleepLogId: sleepLogIdVal,
                context,
                startDateTime: startTime,
                endDateTime: endTime,
                device,
                name,date
            }
        })

        res.status(200).json(hrvRecording);

        if (changeRRData) {
            fs.writeFileSync(`./rrdata/${updatedHrvRecording.id}.txt`, rrdata);

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