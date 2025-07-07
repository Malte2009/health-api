import prisma from '../prisma/client';

export const calculateExerciseScore = async (avgReps: number, avgWeight: number, exerciseName: string, userId: string) => {

	if (avgReps < 1 || avgWeight < 0) {
		return 0;
	}

	const lastScore = await prisma.exerciseScore.findFirst({
		where: {
			exerciseName,
			userId
		}
	});

	let factor: number | undefined = lastScore?.factor;

	if (lastScore && lastScore.lastWeight > avgWeight) {
		factor = (await prisma.exerciseScoreHistory.findFirst({
			where: {
				weight: avgWeight,
				userId,
				exerciseName
			},
			select: {
				factor: true
			}
		}))?.factor;

		if (!factor) {
			const data = await prisma.exerciseScoreHistory.findFirst({
				select: {
					weight: true,
					reps: true
				},
				orderBy: {
					weight: 'asc'
				},
				where: {
					userId,
					exerciseName
				}
		});

		if (data?.reps && data?.weight) factor = (avgWeight * data.reps) / (avgReps * data.weight);
		}
	} else if (lastScore && lastScore.lastWeight < avgWeight) {
		factor = (avgWeight * lastScore.lastReps) / (avgReps * lastScore.lastWeight);
	}

	if (!factor) {
		factor = 1;
	}

	let exerciseScore = Math.round(factor * avgReps / avgWeight * 100);

	if (!lastScore) {
		await prisma.exerciseScore.create({
			data: {
				userId,
				exerciseName,
				lastWeight: avgWeight,
				lastReps: avgReps,
				factor
			}
		});
	} else {
		await prisma.exerciseScore.update({
			where: {
				id: lastScore.id,
				userId
			},
			data: {
				lastWeight: avgWeight,
				lastReps: avgReps,
				factor
			}
		});
	}

	if (exerciseScore < 0) exerciseScore = 0;

	const history = await prisma.exerciseScoreHistory.findFirst({
		where: {
			weight: avgWeight,
			reps: avgReps,
			factor,
			userId,
			exerciseName
		}
	});

	if (!history) {
		try {
			await prisma.exerciseScoreHistory.create({
				data: {
					factor,
					weight: avgWeight,
					reps: avgReps,
					score: exerciseScore,
					userId,
					exerciseName
				}
			});
		} catch (error) {
			console.error("Error creating exercise score history:", error);
		}
	}

	return exerciseScore;
}
