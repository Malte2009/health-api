import prisma from '../prisma/client';

export async function getAge(userId: string): Promise<number> {
    if (!userId) return 0;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { birthYear: true }
    });

    if (!user || !user.birthYear) return 0;

    const currentYear = new Date().getFullYear();
    return currentYear - user.birthYear;
}

export async function getGender(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { gender: true, }
    });

    if (!user) return "";

    return user.gender;
}