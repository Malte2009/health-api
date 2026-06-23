import { parentPort, workerData } from 'worker_threads';
import prisma from '../../prisma/client';
import { calculateHrvMetrics, calculateHrvWindows } from '../../utility/calculateHrvMetrics';

async function run() {
    const { recordingId, startDateTime, generationToken } = workerData;

    try {
        const claimed = await prisma.hrvRecording.updateMany({
            where: {
                id: recordingId,
                generationToken,
                generationStatus: 'pending'
            },
            data: { generationStatus: 'processing' }
        });

        if (claimed.count === 0) {
            parentPort?.postMessage({ success: false, stale: true });
            return;
        }

        const hrvMetrics = calculateHrvMetrics(recordingId);
        const windows = calculateHrvWindows(recordingId, new Date(startDateTime));

        const stored = await prisma.$transaction(async (transaction) => {
            const stillCurrent = await transaction.hrvRecording.updateMany({
                where: {
                    id: recordingId,
                    generationToken,
                    generationStatus: 'processing'
                },
                data: { generationStatus: 'processing' }
            });

            if (stillCurrent.count === 0) return false;

            await transaction.hrvMetrics.deleteMany({
                where: { hrvRecordingId: recordingId }
            });
            await transaction.hrvWindow.deleteMany({
                where: { recordingId }
            });

            await transaction.hrvMetrics.createMany({
                data: hrvMetrics.map(metric => ({
                    ...metric,
                    hrvRecordingId: recordingId
                }))
            });

            for (const window of windows) {
                await transaction.hrvWindow.create({
                    data: {
                        recordingId: window.recordingId,
                        windowStart: window.windowStart,
                        durationSeconds: window.durationSeconds,
                        metrics: { create: window.metrics }
                    }
                });
            }

            await transaction.hrvRecording.update({
                where: { id: recordingId },
                data: {
                    generationStatus: 'ready',
                    generatedAt: new Date(),
                    generationToken: null
                }
            });

            return true;
        });

        parentPort?.postMessage({ success: stored, stale: !stored });
    } catch (error) {
        console.error("Worker failed:", error);
        await prisma.hrvRecording.updateMany({
            where: { id: recordingId, generationToken },
            data: {
                generationStatus: 'failed',
                generatedAt: null,
                generationToken: null
            }
        }).catch(updateError => console.error("Failed to update HRV generation state:", updateError));
        parentPort?.postMessage({ error: (error as Error).message });
    } finally {
        await prisma.$disconnect();
    }
}

run();

