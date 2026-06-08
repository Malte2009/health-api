import prisma from "../prisma/client";


export async function getHoursSinceLastCaffeine(date: Date, userId: string): Promise<null | number[]> {
    if (!date || !userId) return null;

    date = new Date(date);

    try {
        const foodLogs = await prisma.foodLog.findMany({
            where: {
                userId: userId,
                date: {
                    lte: date
                },
                food: {
                    nutrients: {
                        caffeine: {
                            gte: 10
                        }
                    }
                }
            },
            orderBy: {
                date: "desc",
            },
            include: {
                food: {
                    include: {
                        nutrients: true
                    }
                }
            }
        });

        if (foodLogs.length === 0) return null;

        let totalCaffeine = 0;
        const lastLogDate = foodLogs[0].date || foodLogs[0].createdAt;
        const CLUSTER_WINDOW_HOURS = 2;

        for (let i = 0; i < foodLogs.length; i++) {
            const log = foodLogs[i];
            const logDate = log.date || log.createdAt;
            
            // Calculate difference between the very last log and the current log in the loop
            const diffHours = (lastLogDate.getTime() - logDate.getTime()) / (1000 * 60 * 60);

            if (diffHours <= CLUSTER_WINDOW_HOURS) {
                const amount = ((log.food.nutrients?.caffeine || 0) as number) * ((log?.weight_g || 1) / ((log.food?.density_g_per_ml || null) || (log.food?.g_per_portion || 1))) / 100;
                totalCaffeine += amount;
            } else {
                // Once we exceed the window, we stop adding to the cluster
                break;
            }
        }

        return [(date.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60), totalCaffeine];
    } catch (error) {
        console.error(error);
        return null;
    }
}