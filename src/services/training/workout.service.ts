import prisma from "../../prisma/client";

class WorkoutService {
    async getWorkouts(userId: string, includeExercises: boolean = true, includeSets: boolean = true) {
        return prisma.workout.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' },
            include: {
                workoutExercises: includeExercises ? { include: { workoutSets: includeSets, exercise: true } } : false
            }
        })
    }
    async getWorkoutById(userId: string, workoutId: string, includeExercises: boolean = true, includeSets: boolean = true) {
        return prisma.workout.findFirst({
            where: { id: workoutId, userId: userId },
            include: {
                workoutExercises: includeExercises ? { include: { workoutSets: includeSets, exercise: true }} : false
            }
        });
    }
    getWorkoutNames = (userId: string)=> {
        return prisma.workout.findMany({
            where: { userId },
            select: { name : true },
            distinct: ["name"],
            orderBy: { type: "asc"}
        });
    }
    async createWorkout(userId: string, name: string, type?: string, notes?: string, avgHeartRate?: number, duration?: number, pauses?: number, pauseLength?: number, caloriesBurned?: number) {
        return prisma.workout.create({
            data: {
                name,
                type,
                notes,
                avgHeartRate,
                duration,
                pauses,
                pauseLength,
                caloriesBurned,
                userId
            }
        });
    }
    async changeWorkout(userId: string, workoutId: string, name: string, type?: string, notes?: string, avgHeartRate?: number, duration?: number, pauses?: number, pauseLength?: number, caloriesBurned?: number) {
        return prisma.workout.update({
            where: { id: workoutId, userId: userId },
            data: {
                name,
                type,
                notes,
                avgHeartRate,
                duration,
                pauses,
                pauseLength,
                caloriesBurned,
            }
        });
    }
    async deleteWorkout(userId: string, workoutId: string) {
        return prisma.workout.delete({
            where: { id: workoutId, userId: userId }
        });
    }
}

export default new WorkoutService();