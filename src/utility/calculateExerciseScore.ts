import prisma from "../prisma/client";

export async function calculateExerciseScore(workoutExerciseId: string): Promise<number> {
    const workoutExercise = await prisma.workoutExercise.findUnique({
        where: { id: workoutExerciseId },
        include: { workoutSets: true },
    });

    if (!workoutExercise) return 0;

    const workSets = workoutExercise.workoutSets.filter((s) => s.type === "Work");

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