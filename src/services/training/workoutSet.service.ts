import prisma from "../../prisma/client";

class WorkoutSetService {
    getSets = (userId: string, workoutExerciseId?: string, workoutId?: string) => {
        return prisma.workoutSet.findMany({
            where: {
                userId,
                ...(workoutExerciseId != null ? { workoutExerciseId } : {}),
                ...(workoutId != null ? { workoutExercise: { workoutId } } : {})
            },
            orderBy: {
                order: "asc"
            }
        });
    }

    getSetById = (userId: string, setId: string, workoutExerciseId?: string, workoutId?: string) => {
        return prisma.workoutSet.findFirst({
            where: {
                id: setId,
                userId,
                ...(workoutExerciseId != null ? { workoutExerciseId } : {}),
                ...(workoutId != null ? { workoutExercise: { workoutId } } : {})
            }
        });
    }

    getSetTypes = async (userId: string) => {
        return (await prisma.workoutSet.findMany({
            where: { userId },
            select: { type: true },
            distinct: ["type"],
            orderBy: { type: "asc" }
        })).map(set => set.type);
    }

    getSetUnits = async (userId: string) => {
        return (await prisma.workoutSet.findMany({
            where: { userId },
            select: { repUnit: true },
            distinct: ["repUnit"],
            orderBy: { repUnit: "asc" }
        })).map(set => set.repUnit);
    }

    createSet = (userId: string, workoutExerciseId: string, reps: number, weight: number, type?: string, repUnit?: string, setTime?: number, order?: number) => {
        return prisma.workoutSet.create({
            data: {
                workoutExerciseId,
                userId,
                reps,
                weight,
                type,
                repUnit,
                setTime,
                order
            }
        });
    }

    changeSet = (userId: string, setId: string, reps?: number, weight?: number, type?: string | null, repUnit?: string, setTime?: number | null, order?: number) => {
        return prisma.workoutSet.update({
            where: {
                id: setId,
                userId
            },
            data: {
                reps,
                weight,
                type,
                repUnit,
                setTime,
                order
            }
        });
    }

    deleteSet = (userId: string, setId: string) => {
        return prisma.workoutSet.delete({
            where: {
                id: setId,
                userId
            }
        });
    }
}

export default new WorkoutSetService();
