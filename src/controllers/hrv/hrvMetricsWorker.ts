import { parentPort, workerData } from 'worker_threads';
import prisma from '../../prisma/client';
import { calculateMetricsForFilterSet, parseData } from '../../utility/calculateHrvMetrics';

type FilterFlags = {
    adaptive: boolean;
    range: boolean;
    movingAverage: boolean;
    artifact: boolean;
};

async function run() {
    const { recordingId, filters } = workerData as { recordingId: string; filters: FilterFlags };

    try {
        const rawData = parseData(recordingId);
        const metrics = calculateMetricsForFilterSet(rawData, filters);

        const saved = await prisma.hrvMetrics.create({
            data: {
                ...metrics,
                hrvRecordingId: recordingId
            }
        });

        if (parentPort) {
            parentPort.postMessage({ metrics: saved });
        }
    } catch (error) {
        console.error('Metrics worker failed:', error);
        if (parentPort) {
            parentPort.postMessage({ error: (error as Error).message });
        }
    }
}

run();

