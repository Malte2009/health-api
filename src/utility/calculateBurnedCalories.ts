import prisma from '../prisma/client';
import {getAge} from "./userData";

type Mode = 'weights_light' | 'weights_mod' | 'weights_vig' | 'cardio_light' | 'cardio_mod' | 'cardio_vig';

const METS: Record<Mode, number> = {
	weights_light: 3.5,
	weights_mod: 5.0,
	weights_vig: 6.0,
	cardio_light: 4.0,
	cardio_mod: 6.0,
	cardio_vig: 8.0
};

function getMode(avgHeartRate: number, age: number, type: string): Mode {
    const maxHeartRate = 220 - age;
    const hrPercent = (avgHeartRate / maxHeartRate) * 100;

    if (type === 'Weights') {
        if (hrPercent < 55) return 'weights_light';
        if (hrPercent < 70) return 'weights_mod';
        return 'weights_vig';
    } else if (type === 'Cardio') {
        if (hrPercent < 60) return 'cardio_light';
        if (hrPercent < 75) return 'cardio_mod';
        return 'cardio_vig';
    }

    return 'cardio_mod'; // Default mode
}

function kcalFromMET(met: number, weightKg: number, minutes: number) {
  return met * 3.5 * weightKg / 200 * minutes;
}

export async function calculateBurnedCalories(
	userId: string,
    avgHeartRate: number,
    type: string | null,
	duration: number,
	pauses: number = 0,
	pauseLength: number = 0,
	pauseMet: number = 1.5
): Promise<number> {
    const userAge = await getAge(userId);

	const userWeight = (await prisma.bodyLog.findFirst({
		where: { userId: userId },
		orderBy: { createdAt: 'desc' },
		select: { weight: true }
	}))?.weight;

	if (!userAge || !userWeight || !type) return 0;

    const mode = getMode(avgHeartRate, userAge, type);

	const totalPauses = pauses * pauseLength;
	const activeMinutes = Math.max(0, duration - totalPauses);

	const kcalActive = kcalFromMET(METS[mode], userWeight, activeMinutes);
    const kcalPaused = kcalFromMET(pauseMet, userWeight, totalPauses);
	
	return Math.round(kcalActive + kcalPaused);
}