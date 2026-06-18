import prisma from "../../prisma/client";

class ProgressionService {
    async getProgression(userId: string, exerciseId: string) {
        return prisma.exercise.findFirst({
            where: {
                userId: userId,
                id: exerciseId,
            }
        }).workoutExercises({
            select: {
                createdAt: true,
                score: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });
    }
}

export default new ProgressionService();