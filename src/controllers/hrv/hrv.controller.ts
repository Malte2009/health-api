import { Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../prisma/client';
import { applyFiltersToData } from '../../utility/calculateHrvMetrics';
import fs from 'fs/promises';
import path from 'path';
import { Worker } from 'worker_threads';
import { randomUUID } from 'crypto';
import { getOrCreateHealthDayId } from '../../utility/healthDay';

type MetricVariant = 'none' | 'standard' | 'all';

type RrFilterFlags = {
    adaptive: boolean;
    range: boolean;
    movingAverage: boolean;
    artifact: boolean;
};

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

type ParsedRrPayload = {
    text: string;
    count: number;
};

const MIN_RR_INTERVALS = 30;
const MAX_QUERY_STRING_LENGTH = 120;
const TEXT_FIELD_LIMITS = {
    name: 120,
    context: 80,
    device: 80
} as const;

function getRrDataPath(recordingId: string): string {
    return path.join(process.cwd(), 'rrdata', `${recordingId}.txt`);
}

async function ensureRrDataDirectory(): Promise<void> {
    await fs.mkdir(path.join(process.cwd(), 'rrdata'), { recursive: true });
}

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

function isPrismaUniqueError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
}

function sendControllerError(error: unknown, res: Response): Response | undefined {
    console.error(error);
    if (res.headersSent) return undefined;

    if (isPrismaUniqueError(error)) {
        return res.status(409).send('A HRV recording already exists for this workout or sleep log');
    }

    return res.status(500).send('Internal Server Error');
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

function getWorkerExecArgv(extension: '.ts' | '.js'): string[] | undefined {
    return extension === '.ts' ? ['--import', 'tsx'] : undefined;
}

function startHrvGeneration(recordingId: string, startDateTime: Date | null, generationToken: string): void {
    const extension = __filename.endsWith('.ts') ? '.ts' : '.js';
    const workerPath = path.join(__dirname, `hrvWorker${extension}`);
    let worker: Worker;

    try {
        worker = new Worker(workerPath, {
            workerData: { recordingId, startDateTime, generationToken },
            execArgv: getWorkerExecArgv(extension)
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

function normalizeRrPayloadBody(body: unknown): string | null {
    if (typeof body === 'string') return body;
    if (Buffer.isBuffer(body)) return body.toString('utf8');

    if (body && typeof body === 'object') {
        const data = body as Record<string, unknown>;
        const candidate = data.rrdata ?? data.rrData ?? data.data;
        if (typeof candidate === 'string') return candidate;
    }

    return null;
}

function preFilterRRData(rawData: string): ParsedRrPayload {
    const lines = rawData.split(/\r?\n/);
    const filteredLines: string[] = [];

    for (const line of lines) {
        if (!line.trim()) continue;
        const normalizedLine = line.replace(',', '.');
        const num = parseFloat(normalizedLine);
        if (!Number.isFinite(num)) continue;
        if (num <= 100) continue;
        filteredLines.push(num.toString());
    }

    return {
        text: filteredLines.join('\n'),
        count: filteredLines.length
    };
}

function parseRrIntervals(rawData: string): number[] {
    const values: number[] = [];

    for (const line of rawData.split(/\r?\n/)) {
        if (!line.trim()) continue;
        const num = parseFloat(line.replace(',', '.'));
        if (Number.isFinite(num)) {
            values.push(num);
        }
    }

    if (values.length === 0) return values;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

    return median > 3000 ? values.map(value => value / 1000) : values;
}

async function readRrIntervals(recordingId: string): Promise<number[] | null> {
    try {
        const content = await fs.readFile(getRrDataPath(recordingId), 'utf8');
        return parseRrIntervals(content);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw error;
    }
}

async function safeDeleteRrDataFile(recordingId: string): Promise<void> {
    try {
        await fs.unlink(getRrDataPath(recordingId));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.error(`Failed to delete RR data file for recording ${recordingId}:`, error);
        }
    }
}

function parseRrFilterFlags(raw: unknown): RrFilterFlags | null | undefined {
    if (raw === undefined || raw === null) return undefined;
    if (typeof raw !== 'string') return null;

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

    const aliases: Record<string, keyof RrFilterFlags> = {
        adaptive: 'adaptive',
        range: 'range',
        movingaverage: 'movingAverage',
        moving_average: 'movingAverage',
        'moving-average': 'movingAverage',
        movingavg: 'movingAverage',
        artifact: 'artifact'
    };

    const tokens = value.split(',').map(token => token.trim()).filter(Boolean);
    if (tokens.length === 0) return null;

    const filters: RrFilterFlags = {
        adaptive: false,
        range: false,
        movingAverage: false,
        artifact: false
    };

    for (const token of tokens) {
        const key = aliases[token];
        if (!key) return null;
        filters[key] = true;
    }

    return filters;
}

function runMetricsWorker(recordingId: string, filters: RrFilterFlags) {
    const extension = __filename.endsWith('.ts') ? '.ts' : '.js';
    const workerPath = path.join(__dirname, `hrvMetricsWorker${extension}`);

    return new Promise((resolve, reject) => {
        const worker = new Worker(workerPath, {
            workerData: { recordingId, filters },
            execArgv: getWorkerExecArgv(extension)
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

function parseRequiredDate(raw: unknown, field: string): { value?: Date; error?: string } {
    if (typeof raw !== 'string' || raw.trim() === '') {
        return { error: `${field} is required` };
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
        return { error: `${field} must be a valid date` };
    }

    return { value: date };
}

function parseOptionalDate(raw: unknown, field: string): { value?: Date; provided: boolean; error?: string } {
    if (raw === undefined || raw === null) return { provided: false };
    if (typeof raw !== 'string' || raw.trim() === '') {
        return { provided: true, error: `${field} must be a valid date` };
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
        return { provided: true, error: `${field} must be a valid date` };
    }

    return { provided: true, value: date };
}

function parseOptionalText(raw: unknown, field: keyof typeof TEXT_FIELD_LIMITS): { value?: string | null; provided: boolean; error?: string } {
    if (raw === undefined || raw === null) return { provided: false };
    if (typeof raw !== 'string') return { provided: true, error: `${field} must be a string` };

    const value = raw.trim();
    if (!value) return { provided: true, value: null };
    if (value.length > TEXT_FIELD_LIMITS[field]) {
        return { provided: true, error: `${field} must be ${TEXT_FIELD_LIMITS[field]} characters or fewer` };
    }

    return { provided: true, value };
}

function parseRelationId(raw: unknown, field: string): { value?: string | null; provided: boolean; error?: string } {
    if (raw === undefined || raw === null) return { provided: false };
    if (typeof raw !== 'string') return { provided: true, error: `${field} must be a string` };

    const value = raw.trim();
    if (!value || value.toLowerCase() === 'null') return { provided: true, value: null };
    if (value.length > MAX_QUERY_STRING_LENGTH) {
        return { provided: true, error: `${field} is too long` };
    }

    return { provided: true, value };
}

type RelationValidationError = {
    status: 400 | 404 | 409;
    message: string;
};

async function validateRelatedRecords(userId: string, workoutId: string | null, sleepLogId: string | null, currentRecordingId?: string): Promise<RelationValidationError | null> {
    if (workoutId && sleepLogId) {
        return {
            status: 400,
            message: 'Only one of workoutId/trainingLogId or sleepLogId/sleepingLogId can be set'
        };
    }

    if (workoutId) {
        const workout = await prisma.workout.findUnique({ where: { id: workoutId, userId } });
        if (!workout) return { status: 404, message: 'Training not found' };

        const existing = await prisma.hrvRecording.findFirst({
            where: {
                workoutId,
                ...(currentRecordingId ? { NOT: { id: currentRecordingId } } : {})
            },
            select: { id: true }
        });
        if (existing) return { status: 409, message: 'A HRV recording already exists for this training' };
    }

    if (sleepLogId) {
        const sleepingLog = await prisma.sleepLog.findUnique({ where: { id: sleepLogId, userId } });
        if (!sleepingLog) return { status: 404, message: 'Sleep not found' };

        const existing = await prisma.hrvRecording.findFirst({
            where: {
                sleepLogId,
                ...(currentRecordingId ? { NOT: { id: currentRecordingId } } : {})
            },
            select: { id: true }
        });
        if (existing) return { status: 409, message: 'A HRV recording already exists for this sleep log' };
    }

    return null;
}

function datesDiffer(a: Date | null, b: Date | null): boolean {
    if (a === null && b === null) return false;
    if (a === null || b === null) return true;
    return a.getTime() !== b.getTime();
}

export const getHrvRecording = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    const includeWindows = req.query.includeWindows === 'true';

    try {
        const hrvRecording = await prisma.hrvRecording.findMany({
            where: { userId },
            include: {
                metrics: true,
                windows: includeWindows,
                sleepLog: true
            },
            orderBy: { date: 'desc' }
        });

        return res.status(200).json(hrvRecording.map(({ generationToken, ...recording }) => recording));
    } catch (error) {
        return sendControllerError(error, res);
    }
};

export const getHrvRecordingById = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    const recordingId = req.params.id;
    const includeWindows = req.query.includeWindows === 'true';

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
        });

        if (!hrvRecording) return res.status(404).send('HRV Recording not found');

        const { generationToken, ...response } = hrvRecording;
        return res.status(200).json(response);
    } catch (error) {
        return sendControllerError(error, res);
    }
};

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
            return res.status(404).send('HRV Recording not found');
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
        return sendControllerError(error, res);
    }
};

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
            return res.status(404).send('HRV Recording not found');
        }

        let rawData = await readRrIntervals(recordingId);
        if (!rawData) {
            return res.status(404).send('RR Data file not found');
        }

        const filters = parseRrFilterFlags(req.query.filters);
        if (filters === null) {
            return res.status(400).send('Invalid filters query');
        }
        if (filters) {
            rawData = applyFiltersToData(rawData, filters);
        }

        return res.status(200).type('text/plain').send(rawData.join('\n'));
    } catch (error) {
        return sendControllerError(error, res);
    }
};

export const getHrvWindowData = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    const windowId = req.params.id;

    try {
        const hrvWindow = await prisma.hrvWindow.findUnique({
            where: { id: windowId },
            include: { recording: true }
        });

        if (!hrvWindow || hrvWindow.recording.userId !== userId) {
            return res.status(404).send('HRV Window not found');
        }

        const rawData = await readRrIntervals(hrvWindow.recordingId);
        if (!rawData) {
            return res.status(404).send('RR Data file not found');
        }

        const timeMs = [0];
        for (let i = 1; i < rawData.length; i++) {
            timeMs.push(timeMs[i - 1] + rawData[i - 1]);
        }

        const recStart = hrvWindow.recording.startDateTime?.getTime();
        if (recStart === undefined) {
            return res.status(409).send('HRV recording has no start time');
        }

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
        if (filters === null) {
            return res.status(400).send('Invalid filters query');
        }

        const filteredData = filters ? applyFiltersToData(resultData, filters) : resultData;
        return res.status(200).type('text/plain').send(filteredData.join('\n'));
    } catch (error) {
        return sendControllerError(error, res);
    }
};

export const getHrvMetricsForRecording = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    const recordingId = req.params.id;
    const filters = parseRrFilterFlags(req.query.filters);

    if (!filters) {
        return res.status(400).send('Missing or invalid filters query');
    }

    try {
        const hrvRecording = await prisma.hrvRecording.findUnique({
            where: {
                id: recordingId,
                userId
            }
        });

        if (!hrvRecording) {
            return res.status(404).send('HRV Recording not found');
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
        return sendControllerError(error, res);
    }
};

export const postHrvRecording = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    const rawPayload = normalizeRrPayloadBody(req.body);

    if (rawPayload === null) {
        return res.status(400).send('RR data must be sent as text/plain, application/octet-stream, or { rrdata: string }');
    }

    const rrdata = preFilterRRData(rawPayload);
    if (rrdata.count < MIN_RR_INTERVALS) {
        return res.status(400).send(`RR data must contain at least ${MIN_RR_INTERVALS} valid intervals`);
    }

    const startTime = parseRequiredDate(req.query.startTime, 'startTime');
    if (startTime.error || !startTime.value) return res.status(400).send(startTime.error);

    const endTime = parseOptionalDate(req.query.endTime, 'endTime');
    if (endTime.error) return res.status(400).send(endTime.error);
    if (endTime.value && endTime.value <= startTime.value) {
        return res.status(400).send('endTime must be after startTime');
    }

    const date = parseOptionalDate(req.query.date, 'date');
    if (date.error) return res.status(400).send(date.error);

    const workoutId = parseRelationId(req.query.workoutId ?? req.query.trainingLogId, 'workoutId');
    if (workoutId.error) return res.status(400).send(workoutId.error);

    const sleepLogId = parseRelationId(req.query.sleepLogId ?? req.query.sleepingLogId, 'sleepLogId');
    if (sleepLogId.error) return res.status(400).send(sleepLogId.error);

    const context = parseOptionalText(req.query.context, 'context');
    if (context.error) return res.status(400).send(context.error);

    const device = parseOptionalText(req.query.device, 'device');
    if (device.error) return res.status(400).send(device.error);

    const name = parseOptionalText(req.query.name, 'name');
    if (name.error) return res.status(400).send(name.error);

    try {
        const relationError = await validateRelatedRecords(userId, workoutId.value ?? null, sleepLogId.value ?? null);
        if (relationError) return res.status(relationError.status).send(relationError.message);

        const generationToken = randomUUID();
        const recordingDate = date.value ?? new Date();
        const healthDayId = await getOrCreateHealthDayId(userId, recordingDate);

        const hrvRecording = await prisma.hrvRecording.create({
            data: {
                date: recordingDate,
                userId,
                healthDayId,
                workoutId: workoutId.value ?? null,
                sleepLogId: sleepLogId.value ?? null,
                context: context.value ?? null,
                device: device.value ?? null,
                startDateTime: startTime.value,
                endDateTime: endTime.value ?? null,
                name: name.value ?? null,
                generationStatus: 'pending',
                generatedAt: null,
                generationToken
            }
        });

        try {
            await ensureRrDataDirectory();
            await fs.writeFile(getRrDataPath(hrvRecording.id), rrdata.text, 'utf8');
        } catch (error) {
            await markGenerationFailed(hrvRecording.id, generationToken);
            throw error;
        }

        const { generationToken: _generationToken, ...response } = hrvRecording;
        res.status(201).json(response);
        startHrvGeneration(hrvRecording.id, hrvRecording.startDateTime, generationToken);
        return undefined;
    } catch (error) {
        return sendControllerError(error, res);
    }
};

export const changeHrvRecording = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    const recordingId = req.params.id;
    const rawPayload = normalizeRrPayloadBody(req.body);
    const changeRRData = rawPayload !== null && rawPayload.trim() !== '';

    let rrdata: ParsedRrPayload | null = null;
    if (changeRRData) {
        rrdata = preFilterRRData(rawPayload);
        if (rrdata.count < MIN_RR_INTERVALS) {
            return res.status(400).send(`RR data must contain at least ${MIN_RR_INTERVALS} valid intervals`);
        }
    }

    const date = parseOptionalDate(req.query.date, 'date');
    if (date.error) return res.status(400).send(date.error);

    const startTime = parseOptionalDate(req.query.startTime, 'startTime');
    if (startTime.error) return res.status(400).send(startTime.error);

    const endTime = parseOptionalDate(req.query.endTime, 'endTime');
    if (endTime.error) return res.status(400).send(endTime.error);

    const workoutId = parseRelationId(req.query.workoutId ?? req.query.trainingLogId, 'workoutId');
    if (workoutId.error) return res.status(400).send(workoutId.error);

    const sleepLogId = parseRelationId(req.query.sleepLogId ?? req.query.sleepingLogId, 'sleepLogId');
    if (sleepLogId.error) return res.status(400).send(sleepLogId.error);

    const context = parseOptionalText(req.query.context, 'context');
    if (context.error) return res.status(400).send(context.error);

    const device = parseOptionalText(req.query.device, 'device');
    if (device.error) return res.status(400).send(device.error);

    const name = parseOptionalText(req.query.name, 'name');
    if (name.error) return res.status(400).send(name.error);

    try {
        const hrvRecording = await prisma.hrvRecording.findUnique({
            where: {
                id: recordingId,
                userId
            }
        });

        if (!hrvRecording) return res.status(404).send('HRV Recording not found');

        const nextWorkoutId = workoutId.provided ? workoutId.value ?? null : hrvRecording.workoutId;
        const nextSleepLogId = sleepLogId.provided ? sleepLogId.value ?? null : hrvRecording.sleepLogId;
        const relationError = await validateRelatedRecords(userId, nextWorkoutId, nextSleepLogId, recordingId);
        if (relationError) return res.status(relationError.status).send(relationError.message);

        const nextDate = date.provided && date.value ? date.value : hrvRecording.date;
        const nextStartTime = startTime.provided ? startTime.value ?? null : hrvRecording.startDateTime;
        const nextEndTime = endTime.provided ? endTime.value ?? null : hrvRecording.endDateTime;

        if (nextStartTime && nextEndTime && nextEndTime <= nextStartTime) {
            return res.status(400).send('endTime must be after startTime');
        }

        const regenerate = changeRRData || datesDiffer(nextStartTime, hrvRecording.startDateTime);
        const generationToken = regenerate ? randomUUID() : null;
        const healthDayId = await getOrCreateHealthDayId(userId, nextDate);

        if (regenerate && !nextStartTime) {
            return res.status(400).send('startTime is required to generate HRV windows');
        }

        if (regenerate && !changeRRData) {
            const existingData = await readRrIntervals(recordingId);
            if (!existingData) return res.status(409).send('RR data file not found for regeneration');
        }

        const updatedHrvRecording = await prisma.hrvRecording.update({
            where: { id: recordingId },
            data: {
                workoutId: nextWorkoutId,
                sleepLogId: nextSleepLogId,
                context: context.provided ? context.value : hrvRecording.context,
                startDateTime: nextStartTime,
                endDateTime: nextEndTime,
                device: device.provided ? device.value : hrvRecording.device,
                name: name.provided ? name.value : hrvRecording.name,
                date: nextDate,
                healthDayId,
                ...(regenerate ? {
                    generationStatus: 'pending' as const,
                    generatedAt: null,
                    generationToken
                } : {})
            }
        });

        if (changeRRData && rrdata) {
            try {
                await ensureRrDataDirectory();
                await fs.writeFile(getRrDataPath(updatedHrvRecording.id), rrdata.text, 'utf8');
            } catch (error) {
                if (generationToken) {
                    await markGenerationFailed(updatedHrvRecording.id, generationToken);
                }
                throw error;
            }
        }

        const { generationToken: _generationToken, ...response } = updatedHrvRecording;
        res.status(200).json(response);

        if (regenerate && generationToken) {
            startHrvGeneration(updatedHrvRecording.id, updatedHrvRecording.startDateTime, generationToken);
        }
        return undefined;
    } catch (error) {
        return sendControllerError(error, res);
    }
};

export const deleteHrvRecording = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    const recordingId = req.params.id;

    try {
        const hrvRecording = await prisma.hrvRecording.findUnique({
            where: {
                id: recordingId,
                userId
            }
        });

        if (!hrvRecording) return res.status(404).send('HRV Recording not found');

        await prisma.hrvRecording.delete({
            where: { id: recordingId }
        });
        await safeDeleteRrDataFile(recordingId);

        return res.status(200).send('Successfully deleted HRV Recording');
    } catch (error) {
        return sendControllerError(error, res);
    }
};
