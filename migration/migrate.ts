import prisma from "../src/prisma/client";
import {getHoursSinceLastCaffeine} from "../src/utility/caffeine";

async function migrate(): Promise<void> {
    console.log("Starting migration");
    try {

        const foodLogs = await prisma.foodLog.findMany({});

        for (const food of foodLogs) {
            if (!food.timestamp) {
                await prisma.foodLog.update({
                    where: {id: food.id},
                    data: {
                        timestamp: food.createdAt
                    }
                })
            }
        }

        const sleepLogs = await prisma.sleepLog.findMany({});

        for (const log of sleepLogs) {
            const userId = log.userId;
            const date = log.bedTime || log.createdAt;

            let lastCaffeine: number[] | null | null[] = await getHoursSinceLastCaffeine(date, userId);

            if (!lastCaffeine) lastCaffeine = [null, null];

            await prisma.sleepLog.update({
                where: { id: log.id },
                data: {
                    hoursSinceLastCaffeine: lastCaffeine[0],
                    lastCaffeineAmountMg: lastCaffeine[1],
                }
            })
        }

        const bpLogs = await prisma.bloodPressureLog.findMany({})

        for (const log of bpLogs) {
            const date = log.timestamp;
            const userId = log.userId;

            let lastCaffeine: number[] | null | null[] = await getHoursSinceLastCaffeine(date, userId);

            if (!lastCaffeine) lastCaffeine = [null, null];

            await prisma.bloodPressureLog.update({
                where: { id: log.id},
                data: {
                    hoursSinceLastCaffeine: lastCaffeine[0],
                    lastCaffeineAmountMg: lastCaffeine[1],
                }
            })
        }
    } catch (err) {
        console.error(err);
    }

    console.log("Migrate finished");
}

migrate();