import { Prisma } from "@prisma/client";
import prisma from "../../prisma/client";

export type HealthDayIncludeOptions = {
    dailyLog?: boolean;
    weather?: boolean;
    bodyLogs?: boolean;
    workouts?: boolean;
    workoutExercises?: boolean;
    workoutSets?: boolean;
    mealLogs?: boolean;
    foodLogs?: boolean;
    food?: boolean;
    intakeLogs?: boolean;
    sleepLogs?: boolean;
    bloodPressureLogs?: boolean;
    symptomLogs?: boolean;
    symptomPictures?: boolean;
    syncopeLogs?: boolean;
    hrvRecordings?: boolean;
    hrvWindows?: boolean;
    hrvMetrics?: boolean;
};

export type HealthDayQueryOptions = {
    date?: Date;
    startDate?: Date;
    endDate?: Date;
    include?: HealthDayIncludeOptions;
};

export type CreateHealthDayInput = {
    date: Date;
};

export type UpdateHealthDayInput = {
    date?: Date;
};

const hasIncludedValues = (include: HealthDayIncludeOptions): boolean => {
    return Object.values(include).some(Boolean);
};

const buildWorkoutInclude = (include: HealthDayIncludeOptions): Prisma.WorkoutInclude => ({
    workoutExercises: include.workoutExercises || include.workoutSets
        ? {
            include: {
                exercise: true,
                workoutSets: include.workoutSets || false,
            },
        }
        : false,
});

const buildMealLogInclude = (include: HealthDayIncludeOptions): Prisma.MealLogInclude => ({
    foodLogs: include.foodLogs || include.food
        ? {
            include: {
                food: include.food || false,
            },
        }
        : false,
});

const buildSymptomLogInclude = (include: HealthDayIncludeOptions): Prisma.SymptomLogInclude => ({
    pictures: include.symptomPictures || false,
});

const buildHrvRecordingInclude = (include: HealthDayIncludeOptions): Prisma.HrvRecordingInclude => ({
    windows: include.hrvWindows || false,
    metrics: include.hrvMetrics || false,
});

const buildHealthDayInclude = (include: HealthDayIncludeOptions = {}): Prisma.HealthDayInclude | undefined => {
    if (!hasIncludedValues(include)) return undefined;

    return {
        dailyLog: include.dailyLog || false,
        weather: include.weather || false,
        bodyLogs: include.bodyLogs || false,
        workouts: include.workouts || include.workoutExercises || include.workoutSets
            ? { include: buildWorkoutInclude(include) }
            : false,
        mealLogs: include.mealLogs || include.foodLogs || include.food
            ? { include: buildMealLogInclude(include) }
            : false,
        intakeLogs: include.intakeLogs || false,
        sleepLogs: include.sleepLogs || false,
        bloodPressureLogs: include.bloodPressureLogs || false,
        symptomLogs: include.symptomLogs || include.symptomPictures
            ? { include: buildSymptomLogInclude(include) }
            : false,
        syncopeLogs: include.syncopeLogs || false,
        hrvRecordings: include.hrvRecordings || include.hrvWindows || include.hrvMetrics
            ? { include: buildHrvRecordingInclude(include) }
            : false,
    };
};

class HealthDayService {
    async getHealthDays(userId: string, options: HealthDayQueryOptions = {}) {
        const where: Prisma.HealthDayWhereInput = { userId };

        if (options.date) {
            where.date = options.date;
        } else if (options.startDate || options.endDate) {
            where.date = {
                ...(options.startDate ? { gte: options.startDate } : {}),
                ...(options.endDate ? { lte: options.endDate } : {}),
            };
        }

        return prisma.healthDay.findMany({
            where,
            ...(buildHealthDayInclude(options.include) ? { include: buildHealthDayInclude(options.include) } : {}),
            orderBy: {
                date: "desc",
            },
        });
    }

    async getHealthDayById(userId: string, id: string, options: HealthDayQueryOptions = {}) {
        return prisma.healthDay.findFirst({
            where: { id, userId },
            ...(buildHealthDayInclude(options.include) ? { include: buildHealthDayInclude(options.include) } : {}),
        });
    }

    async getHealthDayByDate(userId: string, date: Date, options: HealthDayQueryOptions = {}) {
        return prisma.healthDay.findFirst({
            where: {
                userId,
                date,
            },
            ...(buildHealthDayInclude(options.include) ? { include: buildHealthDayInclude(options.include) } : {}),
        });
    }

    async createHealthDay(userId: string, data: CreateHealthDayInput, options: HealthDayQueryOptions = {}) {
        return prisma.healthDay.create({
            data: {
                userId,
                date: data.date,
            },
            ...(buildHealthDayInclude(options.include) ? { include: buildHealthDayInclude(options.include) } : {}),
        });
    }

    async updateHealthDay(userId: string, id: string, data: UpdateHealthDayInput, options: HealthDayQueryOptions = {}) {
        await this.getRequiredHealthDay(userId, id);

        return prisma.healthDay.update({
            where: { id },
            data: {
                ...(data.date ? { date: data.date } : {}),
            },
            ...(buildHealthDayInclude(options.include) ? { include: buildHealthDayInclude(options.include) } : {}),
        });
    }

    async deleteHealthDay(userId: string, id: string) {
        await this.getRequiredHealthDay(userId, id);

        return prisma.healthDay.delete({
            where: { id },
        });
    }

    private async getRequiredHealthDay(userId: string, id: string) {
        const healthDay = await prisma.healthDay.findFirst({
            where: { id, userId },
        });

        if (!healthDay) {
            throw new Error("HEALTH_DAY_NOT_FOUND");
        }

        return healthDay;
    }
}

export default new HealthDayService();
