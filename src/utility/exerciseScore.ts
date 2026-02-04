import prisma from "../prisma/client";
/**
 * Berechnet einen Score basierend auf Arbeitssätzen.
 * - Gewicht wird stärker gewichtet (quadratisch)
 * - Volumen (Reps × Weight²) bildet die Basis
 * - Mehr Sätze mit konsistenter Leistung werden belohnt
 */
export async function calculateExerciseScore(exerciseId: string): Promise<number> {

    const exerciseLog = await prisma.exerciseLog.findUnique({
        where: { id: exerciseId },
        include: { sets: true },
    });

    if (!exerciseLog) return 0;

  const workSets = exerciseLog.sets.filter((s) => s.type === "Work");

  if (workSets.length === 0) return 0;

  // Gesamtvolumen berechnen (Reps × Weight^1.5) - Gewicht wird stärker gewichtet
  const totalVolume = workSets.reduce((sum, set) => sum + set.reps * Math.pow(set.weight, 2), 0);

  // Konsistenzbonus: mehr Sätze = leichter Bonus
  const consistencyBonus = 1 + (workSets.length - 1) * 0.05;

  // Skalierungsfaktor um lesbare Werte zu erhalten
  const scaleFactor = 100;

  const score = (totalVolume * consistencyBonus) / scaleFactor;

  return Math.round(score * 100) / 100;
}

/**
 * Berechnet einen relativen Score basierend auf dem Körpergewicht des Nutzers.
 * Ermöglicht fairen Vergleich zwischen Personen unterschiedlicher Gewichtsklassen.
 *
 * @param exerciseId
 * @param userWeight - Körpergewicht des Nutzers in kg
 * @returns Normalisierter Score (Score pro kg Körpergewicht × 10)
 */
export async function calculateRelativeExerciseScore(exerciseId: string, userWeight: number): Promise<number> {
  if (userWeight <= 0) return 0;

  const baseScore = await calculateExerciseScore(exerciseId);

  // Score pro kg Körpergewicht, multipliziert mit 10 für lesbarere Werte
  const relativeScore = (baseScore / userWeight) * 10;

  return Math.round(relativeScore * 100) / 100;
}

export async function calculateExerciseScoreForAllExercises(): Promise<void> {
    const exerciseLogs = await prisma.exerciseLog.findMany({
        select: { id: true }
    });

    for (const exercise of exerciseLogs) {
        const score = await calculateExerciseScore(exercise.id);
        await prisma.exerciseLog.update({
            where: { id: exercise.id },
            data: { score: score }
        });
    }
}