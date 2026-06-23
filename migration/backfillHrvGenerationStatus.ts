import prisma from "../src/prisma/client";

type StatusCount = {
    generationStatus: string;
    count: bigint;
};

const getStatusCounts = async (): Promise<StatusCount[]> => prisma.$queryRaw<StatusCount[]>`
    SELECT
        "generationStatus"::text AS "generationStatus",
        COUNT(*)::bigint AS "count"
    FROM "HrvRecording"
    GROUP BY "generationStatus"
    ORDER BY "generationStatus"
`;

const formatCounts = (counts: StatusCount[]): string => counts
    .map(({ generationStatus, count }) => `${generationStatus}=${count}`)
    .join(", ");

const main = async (): Promise<void> => {
    const before = await getStatusCounts();
    console.log(`HRV generation states before backfill: ${formatCounts(before) || "none"}`);

    const updated = await prisma.$executeRaw`
        UPDATE "HrvRecording" recording
        SET
            "generationStatus" = 'ready'::"HrvGenerationStatus",
            "generatedAt" = (
                SELECT MAX(hrv_window."createdAt")
                FROM "HrvWindow" hrv_window
                WHERE hrv_window."recordingId" = recording."id"
            )
        WHERE recording."generationStatus" = 'pending'::"HrvGenerationStatus"
          AND recording."generationToken" IS NULL
    `;

    const after = await getStatusCounts();
    console.log(`Backfilled ${updated} legacy HRV recordings to ready.`);
    console.log(`HRV generation states after backfill: ${formatCounts(after) || "none"}`);
};

main()
    .catch(error => {
        console.error("HRV generation-state backfill failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
