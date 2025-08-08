import prisma from '../prisma/client';

type Mode = 'weights_light' | 'weights_mod' | 'weights_vig' | 'cardio';

const METS: Record<Mode, number> = {
	weights_light: 3.5,
	weights_mod: 5.0,
	weights_vig: 6.0,
	cardio: 7.0,
};

function kcalFromMET(met: number, weightKg: number, minutes: number) {
  return met * 3.5 * weightKg / 200 * minutes;
}

export async function calculateBurnedCalories(
	userId: string,
	mode: Mode,
	avgHeartRate: number,
	duration: number,
	pauses: number = 0,
	pauseLength: number = 0,
	pauseMet: number = 1.5
): Promise<number> {
	const userGender = (await prisma.user.findUnique({
        where: { id: userId },
        select: { gender: true }
    }))?.gender;

	const userWeight = (await prisma.bodyLog.findFirst({
		where: { userId: userId },
		orderBy: { createdAt: 'desc' },
		select: { weight: true }
	}))?.weight;

	if (!userGender || !userWeight) return 0;

	const totalPauses = pauses * pauseLength;
	const activeMinutes = Math.max(0, duration - totalPauses);

	const kcalActive = kcalFromMET(METS[mode], userWeight, activeMinutes);
	const kcalPaused = kcalFromMET(pauseMet, userWeight, totalPauses);
	
	return Math.round(kcalActive + kcalPaused);
}