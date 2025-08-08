import prisma from '../prisma/client';

export async function calculateBurnedCalories(
	userId: string,
	avgHeartRate: number,
	duration: number,
	pauses: number = 0,
	pauseLength: number = 0,
): Promise<number> {
	const userData = await prisma.user.findUnique({
        where: { id: userId },
        select: { gender: true, birthYear: true }
    });

	const userWeight = (await prisma.bodyLog.findFirst({
		where: { userId: userId },
		orderBy: { createdAt: 'desc' },
		select: { weight: true }
	}))?.weight;

	if (!userData || !userWeight) return 0;

	const userAge = new Date().getFullYear() - userData.birthYear;
	const activeDuration = duration - pauses * pauseLength;

	let activeCaloriesPerMinute = 0;

	if (userData.gender === "male") {
		activeCaloriesPerMinute = ((-55.0969 + (0.6309 * avgHeartRate) + (0.1988 * userWeight) + (0.2017 * userAge)) / 4.184)
	} else if (userData.gender === "female") {
		activeCaloriesPerMinute = ((-20.4022 + (0.4472 * avgHeartRate) - (0.1263 * userWeight) + (0.074 * userAge)) / 4.184)
	}

	let passiveCaloriesPerMin = activeCaloriesPerMinute * 0.7;

	let caloriesBurned = Math.round((activeCaloriesPerMinute * activeDuration) + (passiveCaloriesPerMin * pauseLength * pauses));

	if (caloriesBurned < 0) return 0;

	return caloriesBurned;
}