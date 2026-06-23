import prisma from "../src/prisma/client";

type DuplicateSummary = {
    duplicateGroups: bigint;
    duplicateRows: bigint;
};

const getDuplicateSummary = async (): Promise<DuplicateSummary> => {
    const [summary] = await prisma.$queryRaw<DuplicateSummary[]>`
        SELECT
            COUNT(*)::bigint AS "duplicateGroups",
            COALESCE(SUM("windowCount" - 1), 0)::bigint AS "duplicateRows"
        FROM (
            SELECT COUNT(*)::bigint AS "windowCount"
            FROM "HrvWindow"
            GROUP BY "recordingId", "windowStart"
            HAVING COUNT(*) > 1
        ) duplicate_windows
    `;

    return summary ?? { duplicateGroups: 0n, duplicateRows: 0n };
};

const main = async (): Promise<void> => {
    const before = await getDuplicateSummary();

    console.log(
        `Found ${before.duplicateRows} stale HRV windows across ${before.duplicateGroups} duplicate groups.`,
    );

    const { deletedWindows, deletedMetrics } = await prisma.$transaction(async transaction => {
        const deletedWindows = await transaction.$executeRaw`
            WITH ranked_windows AS (
                SELECT
                    "id",
                    ROW_NUMBER() OVER (
                        PARTITION BY "recordingId", "windowStart"
                        ORDER BY
                            COALESCE("changedAt", "createdAt") DESC,
                            "createdAt" DESC,
                            "id" DESC
                    ) AS duplicate_rank
                FROM "HrvWindow"
            )
            DELETE FROM "HrvWindow"
            WHERE "id" IN (
                SELECT "id"
                FROM ranked_windows
                WHERE duplicate_rank > 1
            )
        `;

        const deletedMetrics = await transaction.$executeRaw`
            WITH ranked_metrics AS (
                SELECT
                    "id",
                    ROW_NUMBER() OVER (
                        PARTITION BY
                            "hrvWindowId",
                            "adaptiveFilteringApplied",
                            "rangeFilteringApplied",
                            "movingAverageFilteringApplied",
                            "artifactFilteringApplied"
                        ORDER BY
                            COALESCE("changedAt", "createdAt") DESC,
                            "createdAt" DESC,
                            "id" DESC
                    ) AS duplicate_rank
                FROM "hrvMetrics"
                WHERE "hrvWindowId" IS NOT NULL
            )
            DELETE FROM "hrvMetrics"
            WHERE "id" IN (
                SELECT "id"
                FROM ranked_metrics
                WHERE duplicate_rank > 1
            )
        `;

        return { deletedWindows, deletedMetrics };
    });

    const after = await getDuplicateSummary();
    if (after.duplicateRows !== 0n) {
        throw new Error(`Cleanup incomplete: ${after.duplicateRows} duplicate HRV windows remain.`);
    }

    console.log(`Deleted ${deletedWindows} stale HRV windows and ${deletedMetrics} duplicate metrics.`);
    console.log("HRV window cleanup complete. Prisma can now add the unique constraint.");
};

main()
    .catch(error => {
        console.error("HRV window cleanup failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
