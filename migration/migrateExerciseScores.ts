import prisma from "../src/prisma/client";
import {calculateExerciseScore} from "../src/utility/calculateExerciseScore";

async function main() {
    const exerciseLogs = await prisma.exerciseLog.findMany();

    console.log("Starting Calculation")

    for (const exerciseLog of exerciseLogs) {
        if (exerciseLog.score) continue;

        await prisma.exerciseLog.update({
            where: {
                id: exerciseLog.id,
            },
            data: {
                score: await calculateExerciseScore(exerciseLog.id),
            }
        })
    }

    console.log("Finished Calculation")
}

main()