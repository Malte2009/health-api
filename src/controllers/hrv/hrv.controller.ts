import { Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../prisma/client';
import { applyFiltersToData, calculateMetricsForFilterSet, parseData } from '../../utility/calculateHrvMetrics';
import fs from "fs"
import path from "path";
import { Worker } from "worker_threads";
import { randomUUID } from "crypto";
import { getOrCreateHealthDayId } from '../../utility/healthDay';

type MetricVariant = 'none' | 'standard' | 'all';

type HrvMetricRecordMetadata = {
    id: string;
    createdAt: Date;
    changedAt: Date | null;
    hrvRecordingId: string | null;
    hrvWindowId: string | null;
};

type HrvMetricFilterFlags = {
    adaptiveFilteringApplied: boolean | null;
    rangeFilteringApplied: boolean | null;
    movingAverageFilteringApplied: boolean | null;
    artifactFilteringApplied: boolean | null;
};

function getMetricVariant(metric: HrvMetricFilterFlags): MetricVariant | null {
    const adaptive = metric.adaptiveFilteringApplied === true;
    const range = metric.rangeFilteringApplied === true;
    const movingAverage = metric.movingAverageFilteringApplied === true;
    const artifact = metric.artifactFilteringApplied === true;

    if (!adaptive && !range && !movingAverage && !artifact) return 'none';
    if (!adaptive && range && movingAverage && artifact) return 'standard';
    if (adaptive && range && movingAverage && artifact) return 'all';
    return null;
}

function toHrvMetricsDto<T extends HrvMetricRecordMetadata>(metric: T): Omit<T, keyof HrvMetricRecordMetadata> {
    const { id, createdAt, changedAt, hrvRecordingId, hrvWindowId, ...dto } = metric;
    return dto;
}

function freshness(record: { createdAt: Date; changedAt: Date | null }): number {
    return (record.changedAt ?? record.createdAt).getTime();
}

async function markGenerationFailed(recordingId: string, generationToken: string): Promise<void> {
    await prisma.hrvRecording.updateMany({
        where: { id: recordingId, generationToken },
        data: {
            generationStatus: 'failed',
            generatedAt: null,
            generationToken: null
        }
    }).catch(error => console.error('Failed to update HRV generation state:', error));
}

function startHrvGeneration(recordingId: string, startDateTime: Date | null, generationToken: string): void {
    const extension = __filename.endsWith('.ts') ? '.ts' : '.js';
    const workerPath = path.join(__dirname, `hrvWorker${extension}`);
    let worker: Worker;

    try {
        worker = new Worker(workerPath, {
            workerData: { recordingId, startDateTime, generationToken },
            execArgv: extension === '.ts' ? ['--require', 'ts-node/register'] : undefined
        });
    } catch (error) {
        console.error('Failed to start HRV generation worker:', error);
        void markGenerationFailed(recordingId, generationToken);
        return;
    }

    worker.on('message', (message) => {
        if (message?.error) console.error('HRV generation worker failed:', message.error);
    });
    worker.on('error', (error) => {
        console.error('HRV generation worker error:', error);
        void markGenerationFailed(recordingId, generationToken);
    });
    worker.on('exit', (code) => {
        if (code !== 0) {
            console.error(`HRV generation worker stopped with exit code ${code}`);
            void markGenerationFailed(recordingId, generationToken);
        }
    });
}

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

    const includeWindows = req.query.includeWindows === "true";

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

        return res.status(200).json(hrvRecording.map(({ generationToken, ...recording }) => recording));
    } catch (error) {
        console.error(error);
    }
}

export const getHrvRecordingById = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;

    const recordingId = req.params.id;

    const includeWindows = req.query.includeWindows === "true";

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

        if (!hrvRecording) return res.status(200).json(null);
        const { generationToken, ...response } = hrvRecording;
        return res.status(200).json(response);
    } catch (error) {
        console.error(error);
    }
}

export const getHrvWindows = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    const recordingId = req.params.recordingId;

    try {
        const recording = await prisma.hrvRecording.findUnique({
            where: { id: recordingId, userId },
            select: {
                id: true,
                name: true,
                date: true,
                startDateTime: true,
                endDateTime: true,
                context: true,
                device: true,
                generationStatus: true,
                generatedAt: true,
                windows: {
                    orderBy: [
                        { windowStart: 'asc' },
                        { createdAt: 'desc' }
                    ],
                    include: {
                        metrics: {
                            orderBy: { createdAt: 'desc' }
                        }
                    }
                }
            }
        });

        if (!recording) {
            return res.status(404).send("HRV Recording not found");
        }

        const newestWindowByStart = new Map<number, typeof recording.windows[number]>();
        for (const window of recording.windows) {
            const key = window.windowStart.getTime();
            const existing = newestWindowByStart.get(key);
            if (!existing || freshness(window) > freshness(existing)) {
                newestWindowByStart.set(key, window);
            }
        }

        const windows = Array.from(newestWindowByStart.values())
            .sort((a, b) => a.windowStart.getTime() - b.windowStart.getTime())
            .map(window => {
                const metrics: Record<MetricVariant, ReturnType<typeof toHrvMetricsDto> | null> = {
                    none: null,
                    standard: null,
                    all: null
                };

                for (const metric of [...window.metrics].sort((a, b) => freshness(b) - freshness(a))) {
                    const variant = getMetricVariant(metric);
                    if (variant && metrics[variant] === null) {
                        metrics[variant] = toHrvMetricsDto(metric);
                    }
                }

                return {
                    id: window.id,
                    windowStart: window.windowStart,
                    durationSeconds: window.durationSeconds,
                    eventTag: window.eventTag,
                    metrics
                };
            });

        return res.status(200).json({
            recording: {
                id: recording.id,
                name: recording.name,
                date: recording.date,
                startDateTime: recording.startDateTime,
                endDateTime: recording.endDateTime,
                context: recording.context,
                device: recording.device
            },
            generationStatus: recording.generationStatus,
            generatedAt: recording.generatedAt,
            windows
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
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

    const date = req.query.date ? new Date(req.query.date as string) : new Date();

    let workoutId: string | null = (req.query.workoutId ?? req.query.trainingLogId) as string;
    let sleepLogId: string | null = req.query.sleepingLogId as string;
    const context = req.query.context as string;
    const startTime = new Date(req.query.startTime as string);
    const endTime = new Date(req.query.endTime as string);
    const device = req.query.device as string;
    const name = req.query.name as string;

    if (!workoutId) workoutId = null
    if (!sleepLogId) sleepLogId = null

    try {
        const generationToken = randomUUID();
        const healthDayId = await getOrCreateHealthDayId(userId, date);

        if (workoutId) {
            const workout = await prisma.workout.findUnique({
                where : {
                    id: workoutId,
                    userId
                }
            })

            if (!workout) {
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
                healthDayId,
                workoutId,
                sleepLogId,
                context,
                device,
                startDateTime: startTime,
                endDateTime: endTime,
                name,
                generationStatus: 'pending',
                generatedAt: null,
                generationToken
            }
        })

        try {
            fs.writeFileSync(`./rrdata/${hrvRecording.id}.txt`, rrdata);
        } catch (error) {
            await markGenerationFailed(hrvRecording.id, generationToken);
            throw error;
        }

        const { generationToken: _generationToken, ...response } = hrvRecording;
        res.status(200).json(response);
        startHrvGeneration(hrvRecording.id, hrvRecording.startDateTime, generationToken);
    } catch (error) {
        console.error(error);

        return res.status(500).send("Internal Server Error");
    }
}

export const changeHrvRecording = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;

    let rrdata = req.body;
    let workoutId = (req.query.workoutId ?? req.query.trainingLogId) as string;
    let sleepLogId = req.query.sleepLogId as string;
    let context = req.query.context as string;
    let startTime = new Date(req.query.startTime as string);
    let endTime = new Date(req.query.endTime as string);
    let device = req.query.device as string;
    let name = req.query.name as string;
    let date = new Date(req.query.date as string);

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

        if (workoutId === undefined) workoutId = hrvRecording.workoutId || "";
        if (sleepLogId === undefined) sleepLogId = hrvRecording.sleepLogId || "";
        if (context === undefined) context = hrvRecording.context || "";
        if (startTime == null || isNaN(startTime.getTime())) startTime = hrvRecording.startDateTime || new Date(0);
        if (endTime == null || isNaN(endTime.getTime())) endTime = hrvRecording.endDateTime || new Date(0);
        if (device === undefined) device = hrvRecording.device || "";
        if (name === undefined) name = hrvRecording.name || "";
        if (isNaN(date.getTime())) date = hrvRecording.date;

        const healthDayId = await getOrCreateHealthDayId(userId, date);

        const workoutIdVal = workoutId === "" ? null : workoutId;
        const sleepLogIdVal = sleepLogId === "" ? null : sleepLogId;
        const generationToken = changeRRData ? randomUUID() : null;

        const updatedHrvRecording = await prisma.hrvRecording.update({
            where: { id: req.params.id },
            data: {
                workoutId: workoutIdVal,
                sleepLogId: sleepLogIdVal,
                context,
                startDateTime: startTime,
                endDateTime: endTime,
                device,
                name,
                date,
                healthDayId,
                ...(changeRRData ? {
                    generationStatus: 'pending' as const,
                    generatedAt: null,
                    generationToken
                } : {})
            }
        })

        if (changeRRData) {
            try {
                fs.writeFileSync(`./rrdata/${updatedHrvRecording.id}.txt`, rrdata);
            } catch (error) {
                if (generationToken) {
                    await markGenerationFailed(updatedHrvRecording.id, generationToken);
                }
                throw error;
            }
        }

        const { generationToken: _generationToken, ...response } = updatedHrvRecording;
        res.status(200).json(response);

        if (changeRRData && generationToken) {
            startHrvGeneration(updatedHrvRecording.id, updatedHrvRecording.startDateTime, generationToken);
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
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
