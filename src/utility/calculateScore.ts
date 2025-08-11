

export function calculateScore(sets: { weight: number, reps: number, type: string}[], opt?: { capReps?: number, weightPower?: number, durationMin?: number, bodyweight?: number}) {
	const cap = opt?.capReps ?? 20;
	const p = opt?.weightPower ?? 1.6;

	if (sets.length === 0) return { score: 0, density: 0, relative: 0, oneRM: 0 };

	const oneRM = Math.max(...sets.map(set => set.weight * (1 + set.reps / 30)));

	const score = sets.reduce((sum, s) => {
		if (s.type === "Warmup") return sum;
		const reps = Math.max(0, Math.min(s.reps, cap));
		const ri = oneRM > 0 ? s.weight / oneRM : 0; // relative intensity
		return sum + reps * s.weight * Math.pow(Math.max(ri, 0), p);
	}, 0);

	const density = opt?.durationMin ? score / opt.durationMin : 0;
	const relative = opt?.bodyweight ? score / opt.bodyweight : 0;

	return { score, density, relative, oneRM };
}