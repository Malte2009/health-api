import prisma from "../../prisma/client";
import { getOrCreateHealthDayId } from "../../utility/healthDay";

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
    getWorkoutNames = async (userId: string)=> {
        return (await prisma.workout.findMany({
            where: { userId },
            select: { name : true },
            distinct: ["name"],
            orderBy: { type: "asc"}
        })).map(workout => workout.name);
    }
    async createWorkout(userId: string, name: string, type?: string, notes?: string, avgHeartRate?: number, duration?: number, pauses?: number, pauseLength?: number, caloriesBurned?: number) {
        const createdAt = new Date();
        const healthDayId = await getOrCreateHealthDayId(userId, createdAt);

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
                userId,
                healthDayId,
                createdAt,
            }
        });
    }
    async changeWorkout(userId: string, workoutId: string, name: string, type?: string, notes?: string, avgHeartRate?: number, duration?: number, pauses?: number, pauseLength?: number, caloriesBurned?: number) {
        const workout = await prisma.workout.findUniqueOrThrow({
            where: { id: workoutId, userId },
            select: { createdAt: true },
        });
        const healthDayId = await getOrCreateHealthDayId(userId, workout.createdAt);

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
                healthDayId,
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
