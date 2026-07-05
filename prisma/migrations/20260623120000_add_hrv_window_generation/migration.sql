-- Remove stale duplicate windows before enforcing one window per timestamp.
WITH ranked_windows AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "recordingId", "windowStart"
            ORDER BY COALESCE("changedAt", "createdAt") DESC, "createdAt" DESC, "id" DESC
        ) AS duplicate_rank
    FROM "HrvWindow"
)
DELETE FROM "HrvWindow"
WHERE "id" IN (
    SELECT "id" FROM ranked_windows WHERE duplicate_rank > 1
);

-- Remove duplicate stored variants on retained windows, keeping the newest metric.
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
            ORDER BY COALESCE("changedAt", "createdAt") DESC, "createdAt" DESC, "id" DESC
        ) AS duplicate_rank
    FROM "hrvMetrics"
    WHERE "hrvWindowId" IS NOT NULL
)
DELETE FROM "hrvMetrics"
WHERE "id" IN (
    SELECT "id" FROM ranked_metrics WHERE duplicate_rank > 1
);

CREATE TYPE "HrvGenerationStatus" AS ENUM ('pending', 'processing', 'ready', 'failed');

ALTER TABLE "HrvRecording"
    ADD COLUMN "generationStatus" "HrvGenerationStatus" NOT NULL DEFAULT 'pending',
    ADD COLUMN "generatedAt" TIMESTAMP(3),
    ADD COLUMN "generationToken" TEXT;

-- Existing recordings have no active job. Treat their current stored result as complete,
-- including recordings that legitimately produced no qualifying windows.
UPDATE "HrvRecording"
SET
    "generationStatus" = 'ready',
    "generatedAt" = (
        SELECT MAX("createdAt")
        FROM "HrvWindow"
        WHERE "HrvWindow"."recordingId" = "HrvRecording"."id"
    );

CREATE UNIQUE INDEX "HrvWindow_recordingId_windowStart_key"
    ON "HrvWindow"("recordingId", "windowStart");
