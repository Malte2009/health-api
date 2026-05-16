import { parentPort, workerData } from 'worker_threads';
import prisma from '../../prisma/client';
import { calculateHrvMetrics, processHrvChunksToDb } from '../../utility/calculateHrvMetrics';

async function run() {
    const { recordingId, startDateTime } = workerData;

    try {
        const hrvMetrics = calculateHrvMetrics(recordingId);

        for (let i = 0; i < hrvMetrics.length; i++) {
            const metric = hrvMetrics[i];

            await prisma.hrvMetrics.create({
                data: {
                    ...metric,
                    hrvRecordingId: recordingId
                }
            });
        }

        await processHrvChunksToDb(recordingId, new Date(startDateTime));

        if (parentPort) {
            parentPort.postMessage({ success: true });
        }
    } catch (error) {
        console.error("Worker failed:", error);
        if (parentPort) {
            parentPort.postMessage({ error: (error as Error).message });
        }
    }
}

run();

