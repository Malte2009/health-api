import prisma from "../prisma/client";

export const toUtcDay = (date: Date): Date => {
    if (Number.isNaN(date.getTime())) {
        throw new RangeError("Invalid date");
    }

    return new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
    ));
};

export const getOrCreateHealthDayId = async (userId: string, date: Date): Promise<string> => {
    const day = toUtcDay(date);
    const healthDay = await prisma.healthDay.upsert({
        where: {
            userId_date: {
                userId,
                date: day,
            },
        },
        create: {
            userId,
            date: day,
        },
        update: {},
        select: { id: true },
    });

    return healthDay.id;
};
