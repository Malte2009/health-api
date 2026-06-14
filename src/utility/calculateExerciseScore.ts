import prisma from "../prisma/client";

export async function calculateExerciseScore(exerciseLogId: string): Promise<number> {
    const exerciseLog = await prisma.exerciseLog.findUnique({
        where: { id: exerciseLogId },
        include: { sets: true },
    });

    if (!exerciseLog) return 0;

    const workSets = exerciseLog.sets.filter((s) => s.type === "Work");

    if (workSets.length === 0) return 0;

    // Gesamtvolumen berechnen (Reps × Weight^2) - Gewicht wird stärker gewichtet
    const totalVolume = workSets.reduce((sum, set) => sum + set.reps * Math.pow(set.weight, 2), 0);

    // Konsistenzbonus: mehr Sätze = leichter Bonus
    const consistencyBonus = 1 + (workSets.length - 1) * 0.05;

    // Skalierungsfaktor um lesbare Werte zu erhalten
    const scaleFactor = 100;

    const score = (totalVolume * consistencyBonus) / scaleFactor;

    return Math.round(score * 100) / 100;
}