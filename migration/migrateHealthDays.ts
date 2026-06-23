import prisma from "../src/prisma/client";

type ModelName =
    | "BodyLog"
    | "DailyLog"
    | "Workout"
    | "MealLog"
    | "IntakeLog"
    | "SleepLog"
    | "BloodPressureLog"
    | "SymptomLog"
    | "SyncopeLog"
    | "HrvRecording";

type RecordToLink = {
    id: string;
    userId: string;
    date: Date;
    model: ModelName;
};

const toUtcDay = (date: Date): Date => new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
));

const healthDayKey = (userId: string, date: Date): string => `${userId}:${date.toISOString()}`;

const addRecords = <T extends { id: string; userId: string }>(
    target: RecordToLink[],
    model: ModelName,
    records: T[],
    getDate: (record: T) => Date,
): void => {
    for (const record of records) {
        target.push({
            id: record.id,
            userId: record.userId,
            date: toUtcDay(getDate(record)),
            model,
        });
    }
};

const main = async (): Promise<void> => {
    console.log("Loading records without a HealthDay...");

    const [
        bodyLogs,
        dailyLogs,
        workouts,
        mealLogs,
        intakeLogs,
        sleepLogs,
        bloodPressureLogs,
        symptomLogs,
        syncopeLogs,
        hrvRecordings,
    ] = await Promise.all([
        prisma.bodyLog.findMany({
            where: { healthDayId: null },
            select: { id: true, userId: true, createdAt: true },
        }),
        prisma.dailyLog.findMany({
            where: { healthDayId: null },
            select: { id: true, userId: true, date: true },
        }),
        prisma.workout.findMany({
            where: { healthDayId: null },
            select: { id: true, userId: true, createdAt: true },
        }),
        prisma.mealLog.findMany({
            where: { healthDayId: null },
            select: { id: true, userId: true, createdAt: true },
        }),
        prisma.intakeLog.findMany({
            where: { healthDayId: null },
            select: { id: true, userId: true, timestamp: true },
        }),
        prisma.sleepLog.findMany({
            where: { healthDayId: null },
            select: { id: true, userId: true, date: true },
        }),
        prisma.bloodPressureLog.findMany({
            where: { healthDayId: null },
            select: { id: true, userId: true, timestamp: true },
        }),
        prisma.symptomLog.findMany({
            where: { healthDayId: null },
            select: { id: true, userId: true, timestamp: true },
        }),
        prisma.syncopeLog.findMany({
            where: { healthDayId: null },
            select: { id: true, userId: true, timestamp: true },
        }),
        prisma.hrvRecording.findMany({
            where: { healthDayId: null },
            select: { id: true, userId: true, date: true },
        }),
    ]);

    const records: RecordToLink[] = [];

    addRecords(records, "BodyLog", bodyLogs, record => record.createdAt);
    addRecords(records, "DailyLog", dailyLogs, record => record.date);
    addRecords(records, "Workout", workouts, record => record.createdAt);
    addRecords(records, "MealLog", mealLogs, record => record.createdAt);
    addRecords(records, "IntakeLog", intakeLogs, record => record.timestamp);
    addRecords(records, "SleepLog", sleepLogs, record => record.date);
    addRecords(records, "BloodPressureLog", bloodPressureLogs, record => record.timestamp);
    addRecords(records, "SymptomLog", symptomLogs, record => record.timestamp);
    addRecords(records, "SyncopeLog", syncopeLogs, record => record.timestamp);
    addRecords(records, "HrvRecording", hrvRecordings, record => record.date);

    if (records.length === 0) {
        console.log("No records need migration.");
        return;
    }

    const daysToCreate = new Map<string, { userId: string; date: Date }>();
    for (const record of records) {
        daysToCreate.set(healthDayKey(record.userId, record.date), {
            userId: record.userId,
            date: record.date,
        });
    }

    const createResult = await prisma.healthDay.createMany({
        data: [...daysToCreate.values()],
        skipDuplicates: true,
    });
    console.log(`Created ${createResult.count} missing HealthDay record(s).`);

    const userIds = [...new Set(records.map(record => record.userId))];
    const healthDays = await prisma.healthDay.findMany({
        where: { userId: { in: userIds } },
        select: { id: true, userId: true, date: true },
    });
    const healthDayIds = new Map(
        healthDays.map(day => [healthDayKey(day.userId, day.date), day.id]),
    );

    const groups = new Map<string, { model: ModelName; healthDayId: string; ids: string[] }>();
    for (const record of records) {
        const healthDayId = healthDayIds.get(healthDayKey(record.userId, record.date));
        if (!healthDayId) {
            throw new Error(`HealthDay was not found for ${record.model} ${record.id}`);
        }

        const groupKey = `${record.model}:${healthDayId}`;
        const group = groups.get(groupKey) ?? { model: record.model, healthDayId, ids: [] };
        group.ids.push(record.id);
        groups.set(groupKey, group);
    }

    const linkedByModel = new Map<ModelName, number>();

    for (const group of groups.values()) {
        const where = { id: { in: group.ids }, healthDayId: null };
        const data = { healthDayId: group.healthDayId };
        let count: number;

        switch (group.model) {
            case "BodyLog":
                count = (await prisma.bodyLog.updateMany({ where, data })).count;
                break;
            case "DailyLog":
                count = (await prisma.dailyLog.updateMany({ where, data })).count;
                break;
            case "Workout":
                count = (await prisma.workout.updateMany({ where, data })).count;
                break;
            case "MealLog":
                count = (await prisma.mealLog.updateMany({ where, data })).count;
                break;
            case "IntakeLog":
                count = (await prisma.intakeLog.updateMany({ where, data })).count;
                break;
            case "SleepLog":
                count = (await prisma.sleepLog.updateMany({ where, data })).count;
                break;
            case "BloodPressureLog":
                count = (await prisma.bloodPressureLog.updateMany({ where, data })).count;
                break;
            case "SymptomLog":
                count = (await prisma.symptomLog.updateMany({ where, data })).count;
                break;
            case "SyncopeLog":
                count = (await prisma.syncopeLog.updateMany({ where, data })).count;
                break;
            case "HrvRecording":
                count = (await prisma.hrvRecording.updateMany({ where, data })).count;
                break;
        }

        linkedByModel.set(group.model, (linkedByModel.get(group.model) ?? 0) + count);
    }

    for (const [model, count] of linkedByModel) {
        console.log(`${model}: linked ${count} record(s).`);
    }

    console.log(`Migration finished. Linked ${records.length} record(s).`);
};

main()
    .catch(error => {
        console.error("HealthDay migration failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
