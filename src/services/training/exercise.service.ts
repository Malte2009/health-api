import prisma from "../../prisma/client";

class ExerciseService {
    async getAllExercises(userId: string) {
        return prisma.exercise.findMany({
            where: {
                userId
            },
            orderBy: {
                name: "asc"
            }
        });
    }
}

export default new ExerciseService();