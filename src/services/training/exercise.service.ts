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
    async getExerciseById(userId: string, exerciseId: string, includeWorkoutExercises: boolean = true) {
        return prisma.exercise.findFirst({
            where: {
                userId,
                id: exerciseId
            },
            include: {
                workoutExercises: includeWorkoutExercises ? { include: { workoutSets: true }} : false
            }
        });
    }
    async createExercise(userId: string, name: string) {
        return prisma.exercise.create({
            data: {
                name,
                userId
            }
        });
    }
    async changeExercise(userId: string, exerciseId: string, newName: string) {
        return prisma.exercise.update({
            where:  {
                id: exerciseId,
                userId
            },
            data: {
                name: newName
            }
        })
    }
    async deleteExercise(userId: string, exerciseId: string) {
        return prisma.exercise.delete({
            where: {
                id: exerciseId,
                userId
            }
        });
    }
}

export default new ExerciseService();