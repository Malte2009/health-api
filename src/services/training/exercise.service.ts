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
    async getExerciseNames(userId: string) {
        return (await prisma.exercise.findMany({
            where: {
                userId
            },
            select: {
                name: true
            },
            distinct: "name",
            orderBy: {
                name: "asc"
            }
        })).map(exercise => {
            return exercise.name;
        })
    }
}

export default new ExerciseService();