import prisma from "../../prisma/client";

class MicroService {
    async getFoodLogsByMicro(userId: string, micro: string, startDate: Date, endDate: Date) {

        return prisma.foodLog.findMany(
            {
                where: {
                    userId: userId,
                    date: {
                        gte: startDate,
                        lte: endDate
                    },
                    food: {
                        nutrients: {
                            [micro]: {
                                gt: 0
                            }
                        }
                    }
                },
                orderBy: {
                    date: "asc"
                },
                include: {
                    food: {
                        select: {
                            name: true,
                            nutrients: true
                        }
                    }
                }
            }
        );
    }
}

export default new MicroService();