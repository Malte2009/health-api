import prisma from "../prisma/client";


export async function getHoursSinceLastCaffeine(date: Date, userId: string): Promise<null | number[]> {
    if (!date || !userId) return null;

    date = new Date(date);

    try {
        let foodLog = await prisma.foodLog.findFirst({
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

        if (!foodLog) return null;

        const caffeineAmount = ((foodLog.food.nutrients?.caffeine || 0) as number) * ((foodLog?.weight_g || 1) / ((foodLog.food?.density_g_per_ml || null) || (foodLog.food?.g_per_portion || 1))) / 100;

        return [(date.getTime() - (foodLog?.date?.getTime() || foodLog?.createdAt.getTime())) / (1000 * 60 * 60), caffeineAmount];
    } catch (error) {
        console.error(error);
        return null;
    }
}