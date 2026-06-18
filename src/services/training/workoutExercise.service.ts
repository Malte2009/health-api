import prisma from "../../prisma/client";
import WorkoutService from "./workout.service";

class WorkoutExerciseService {
    getWorkoutExercises = (userId: string, workoutId: string, includeSets: boolean = true) => {
        return prisma.workoutExercise.findMany({
            where: {
                userId,
                workoutId
            },
            include: {
                workoutSets: includeSets,
                exercise: true
            }
        });
    }
    getWorkoutExerciseById = (userId: string, workoutExerciseId: string, includeSets: boolean = true, workoutId?: string) => {
        return prisma.workoutExercise.findFirst({
            where: {
                userId,
                id: workoutExerciseId,
                ...(workoutId != null ? { workoutId } : {})
            },
            include: {
                workoutSets: includeSets,
                exercise: true
            }
        });
    }
    createWorkoutExercise = async (userId: string, workoutId: string, name: string, notes?: string, order?: number) => {
        const workout = await WorkoutService.getWorkoutById(userId, workoutId, false, false);

        if (!workout) throw new Error("Workout not found");

        return prisma.workoutExercise.create({
            data: {
                notes,
                order,
                exercise: {
                    connectOrCreate: {
                        where: {
                            name_userId: {
                                name,
                                userId
                            }
                        },
                        create: {
                            name,
                            userId
                        }
                    }
                },
                workout: { connect: { id: workoutId }},
                user: { connect: { id: userId }}
            },
            include: {
                exercise: true
            }
        })
    }
    updateWorkoutExercise = async (userId: string, workoutExerciseId: string, workoutId?: string, name?: string, notes?: string, order?: number) => {

        if (workoutId) {
            const workout = await WorkoutService.getWorkoutById(userId, workoutId, false, false);

            if (!workout) throw new Error("Workout not found");
        }

        return prisma.workoutExercise.update({
            where: {
                id: workoutExerciseId,
                userId
            },
            data: {
                notes,
                order,
                ...(name != null ? { exercise: {
                    connectOrCreate: {
                        where: {
                            name_userId: {
                                name,
                                userId
                            }
                        },
                        create: {
                            name,
                            userId
                        }
                    }
                }} : {}),
                workout: {
                    connect: { id: workoutId }
                }
            },
            include: {
                exercise: true
            }
        })
    }
    deleteWorkoutExercise = (userId: string, workoutExerciseId: string) => {
        return prisma.workoutExercise.delete({
            where: {
                id: workoutExerciseId,
                userId
            }
        })
    }
}

export default new WorkoutExerciseService();
