import prisma from "../src/prisma/client";
import {getHoursSinceLastCaffeine} from "../src/utility/caffeine";
import {randomUUID} from "node:crypto";

async function migrate(): Promise<void> {
    console.log("Starting migration");

    try {
        const data = await prisma.exercise.findMany({
            include: {
                exerciseLogs: true
            }
        });

        for (const exercise of data) {
            const uuid = randomUUID();

            await prisma.exercise.update({
                where: {
                    name_userId: {
                        name: exercise.name,
                        userId: exercise.userId
                    }
                },
                data: {
                    id: uuid,
                }
            })

            for (const log of exercise.exerciseLogs) {
                await prisma.exerciseLog.update({
                    where: {
                        id: log.id
                    },
                    data: {
                        exerciseId: uuid
                    }
                })
            }
        }


    } catch (error) {
        console.error(error);
    }

    console.log("Migration finished");
}

migrate();